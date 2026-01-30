import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CustomerAuthStore {
  isAuthenticated: boolean;
  customerName: string | null;
  customerEmail: string | null;
  login: (name: string, email?: string) => void;
  logout: () => void;
}

export const useCustomerAuth = create<CustomerAuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      customerName: null,
      customerEmail: null,

      login: (name: string, email?: string) => {
        set({ 
          isAuthenticated: true, 
          customerName: name,
          customerEmail: email || null
        });
      },

      logout: () => {
        set({ 
          isAuthenticated: false, 
          customerName: null,
          customerEmail: null 
        });
      },
    }),
    {
      name: 'customer-auth',
    }
  )
);
