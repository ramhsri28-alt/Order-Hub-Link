import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminAuthStore {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

export const useAdminAuth = create<AdminAuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      username: null,

      login: (username: string, password: string) => {
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          set({ isAuthenticated: true, username });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false, username: null });
      },
    }),
    {
      name: 'admin-auth',
    }
  )
);
