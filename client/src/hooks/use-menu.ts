import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { type MenuItem } from "@shared/schema";

export function useMenu() {
  return useQuery({
    queryKey: [api.menu.list.path],
    queryFn: async () => {
      // Mock data so the UI can be viewed without a database
      return [
        {
          id: 1,
          name: "Classic Burger",
          description: "Juicy beef patty with fresh lettuce and tomato.",
          price: 85000, // 850.00
          imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
          category: "Mains",
          discount: 0,
          available: true,
        },
        {
          id: 2,
          name: "Margherita Pizza",
          description: "Classic Italian pizza with fresh mozzarella and basil.",
          price: 120000,
          imageUrl: "https://images.unsplash.com/photo-1604068549290-dea0e4a30536?auto=format&fit=crop&w=500&q=80",
          category: "Mains",
          discount: 10,
          available: true,
        },
        {
          id: 3,
          name: "Caesar Salad",
          description: "Crisp romaine lettuce, parmesan cheese, croutons, and Caesar dressing.",
          price: 55000,
          imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=500&q=80",
          category: "Starters",
          discount: 0,
          available: true,
        },
      ] as MenuItem[];
    },
  });
}

export function useMenuItem(id: number) {
  return useQuery({
    queryKey: [api.menu.get.path, id],
    queryFn: async () => {
      const res = await fetch(api.menu.get.path.replace(":id", id.toString()));
      if (!res.ok) throw new Error("Failed to fetch menu item");
      return await res.json() as MenuItem;
    },
  });
}

export function useCreateMenuItem() {
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      price: number;
      imageUrl: string;
      category: string;
      discount?: number;
      available?: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/menu", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menu.list.path] });
    },
  });
}

export function useUpdateMenuItem() {
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: number;
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      category?: string;
      discount?: number;
      available?: boolean;
    }) => {
      const res = await apiRequest("PATCH", `/api/menu/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menu.list.path] });
    },
  });
}

export function useDeleteMenuItem() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/menu/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menu.list.path] });
    },
  });
}
