import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { trackOmnisendAddToCart } from "@/lib/omnisend";

/**
 * Fires "added product to cart" to our server-side Omnisend endpoint (origin: api).
 * This is required to satisfy Omnisend automation triggers set to origin: api.
 * The browser snippet sends origin: web and does NOT match those triggers.
 * Fire-and-forget — never blocks the UI.
 */
async function fireAddedToCartServerEvent(
  item: { name: string; price: number; discount?: number },
  quantity: number
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;
    if (!email) return; // anonymous user — skip server event

    const discount = item.discount ?? 0;
    const effectivePaisa = discount > 0 ? item.price * (1 - discount / 100) : item.price;
    const productPrice = Number((effectivePaisa / 100).toFixed(2));

    fetch("/api/omnisend/added-to-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        currency: "NPR",
        value: productPrice,
        lineItems: [{
          productTitle: item.name,
          productPrice,
          productQuantity: quantity,
        }],
      }),
    }).catch((err) => console.warn("[Omnisend] added-to-cart server event error:", err));
  } catch (err) {
    console.warn("[Omnisend] fireAddedToCartServerEvent error:", err);
  }
}

export interface CartItem extends MenuItem {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  recoveryToken: string | null;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  restoreCart: (items: CartItem[], cartId: string, recoveryToken?: string) => void;
  clearCart: (recovered?: boolean, isPurchased?: boolean) => void;
  getTotal: () => number;
  getCount: () => number;
}

function generateSecureToken(): string {
  try {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Debounce timer for Supabase sync so rapid clicks don't spam the DB
let syncTimer: ReturnType<typeof setTimeout> | null = null;

async function syncToSupabase(
  items: CartItem[],
  cartId: string | null,
  recoveryToken: string | null,
  set: (state: Partial<CartStore>) => void
) {
  try {
    if (items.length === 0) return;

    const totalPrice = items.reduce((sum, item) => {
      const discountedPrice =
        item.discount > 0
          ? item.price * (1 - item.discount / 100)
          : item.price;
      return sum + discountedPrice * item.quantity;
    }, 0);

    // Get current user if logged in
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    const customerEmail = session?.user?.email ?? null;
    const customerName =
      localStorage.getItem("customer_full_name") ??
      session?.user?.user_metadata?.full_name ??
      session?.user?.user_metadata?.name ??
      null;

    const activeToken = recoveryToken || generateSecureToken();
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const payload: Record<string, any> = {
      cart_items: items,
      total_price: totalPrice,
      status: "active",
      user_id: userId,
      customer_email: customerEmail,
      customer_name: customerName,
      recovery_token: activeToken,
      recovery_token_expires_at: sevenDaysLater,
      updated_at: new Date().toISOString(),
    };

    if (cartId) {
      const { error } = await supabase
        .from("abandoned_carts")
        .update(payload)
        .eq("id", cartId);

      if (!error) {
        if (!recoveryToken) set({ recoveryToken: activeToken });
        return;
      }
    }

    // Insert new abandoned cart record
    const { data, error } = await supabase
      .from("abandoned_carts")
      .insert(payload)
      .select("id, recovery_token")
      .single();

    if (!error && data?.id) {
      set({ 
        cartId: data.id,
        recoveryToken: data.recovery_token || activeToken,
      });
    }
  } catch (err) {
    console.warn("Failed to sync abandoned cart to Supabase:", err);
  }
}

function triggerSync(get: () => CartStore, set: (state: Partial<CartStore>) => void) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const { items, cartId, recoveryToken } = get();
    syncToSupabase(items, cartId, recoveryToken, set);
  }, 500);
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      recoveryToken: null,
      isCheckoutOpen: false,

      setIsCheckoutOpen: (open) => set({ isCheckoutOpen: open }),

      restoreCart: (items, cartId, recoveryToken) => {
        set({
          items,
          cartId,
          recoveryToken: recoveryToken || null,
          isCheckoutOpen: true,
        });
      },

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        });
        trackOmnisendAddToCart(item, 1);         // browser snippet (origin: web)
        fireAddedToCartServerEvent(item, 1);     // server-side (origin: api) — triggers automation
        triggerSync(get, set);
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }));
        triggerSync(get, set);
      },

      updateQuantity: (itemId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== itemId) };
          }
          return {
            items: state.items.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
        });
        triggerSync(get, set);
      },

      clearCart: (recovered = true, isPurchased = false) => {
        const { cartId } = get();
        if (cartId) {
          const status = isPurchased ? "purchased" : (recovered ? "recovered" : "active");
          const updateData: Record<string, any> = {
            status,
            updated_at: new Date().toISOString(),
          };
          if (isPurchased) {
            updateData.recovery_token_expires_at = new Date().toISOString();
          }
          supabase
            .from("abandoned_carts")
            .update(updateData)
            .eq("id", cartId)
            .then();
        }
        set({ items: [], cartId: null, recoveryToken: null });
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => {
          const discountedPrice =
            item.discount > 0
              ? item.price * (1 - item.discount / 100)
              : item.price;
          return sum + discountedPrice * item.quantity;
        }, 0);
      },

      getCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'restaurant-cart',
    }
  )
);
