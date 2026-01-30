import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from "@shared/schema";

export interface CartItem extends MenuItem {
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => set((state) => {
        const existing = state.items.find((i) => i.id === item.id);
        if (existing) {
          return {
            items: state.items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),

      removeItem: (itemId) => set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
      })),

      updateQuantity: (itemId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter((i) => i.id !== itemId) };
        }
        return {
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        };
      }),

      clearCart: () => set({ items: [] }),

      get total() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      get count() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }),
    {
      name: 'restaurant-cart',
    }
  )
);
