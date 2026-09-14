import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from "@shared/schema";
import { supabase } from "@/lib/supabase";
import { trackOmnisendAddToCart } from "@/lib/omnisend";

export interface CartItem extends MenuItem {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: (recovered?: boolean) => void;
  getTotal: () => number;
  getCount: () => number;
}

// Debounce timer for Supabase sync so rapid clicks don't spam the DB
let syncTimer: ReturnType<typeof setTimeout> | null = null;

async function syncToSupabase(
  items: CartItem[],
  cartId: string | null,
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

    const payload = {
      cart_items: items,
      total_price: totalPrice,
      status: "active",
      user_id: userId,
      customer_email: customerEmail,
      customer_name: customerName,
      updated_at: new Date().toISOString(),
    };

    if (cartId) {
      const { error } = await supabase
        .from("abandoned_carts")
        .update(payload)
        .eq("id", cartId);

      if (!error) return;
    }

    // Insert new abandoned cart record
    const { data, error } = await supabase
      .from("abandoned_carts")
      .insert({
        cart_items: items,
        total_price: totalPrice,
        status: "active",
        user_id: userId,
        customer_email: customerEmail,
        customer_name: customerName,
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      set({ cartId: data.id });
    }
  } catch (err) {
    console.warn("Failed to sync abandoned cart to Supabase:", err);
  }
}

function triggerSync(get: () => CartStore, set: (state: Partial<CartStore>) => void) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const { items, cartId } = get();
    syncToSupabase(items, cartId, set);
  }, 500);
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,

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
        trackOmnisendAddToCart(item, 1);
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

      clearCart: (recovered = true) => {
        const { cartId } = get();
        if (cartId && recovered) {
          supabase
            .from("abandoned_carts")
            .update({ status: "recovered", updated_at: new Date().toISOString() })
            .eq("id", cartId)
            .then();
        }
        set({ items: [], cartId: null });
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
