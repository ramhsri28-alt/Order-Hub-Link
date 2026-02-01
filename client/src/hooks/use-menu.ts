import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { type MenuItem } from "@shared/schema";

export function useMenu() {
  return useQuery({
    queryKey: [api.menu.list.path],
    queryFn: async () => {
      const res = await fetch(api.menu.list.path);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return await res.json() as MenuItem[];
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
