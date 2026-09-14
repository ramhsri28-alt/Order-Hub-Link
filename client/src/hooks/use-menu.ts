import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type MenuItem } from "@shared/schema";
import { supabase } from "@/lib/supabase";

const MENU_KEY = [api.menu.list.path];

function mapMenuItem(row: any): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.imageUrl ?? row.image_url ?? "",
    category: row.category,
    discount: row.discount ?? 0,
    available: row.available ?? true,
  };
}

export function useMenu() {
  return useQuery({
    queryKey: MENU_KEY,
    queryFn: async () => {
      // 1. Try Express API (works on localhost)
      try {
        const res = await fetch(api.menu.list.path);
        if (res.ok) {
          const data = await res.json();
          return (data as any[]).map(mapMenuItem);
        }
      } catch (err) {
        // Express backend not present or not reachable
      }

      // 2. Direct Supabase query (works on Vercel & GitHub Pages)
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("category")
        .order("name");

      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map(mapMenuItem);
    },
  });
}

export function useMenuItem(id: number) {
  return useQuery({
    queryKey: [api.menu.get.path, id],
    queryFn: async () => {
      try {
        const res = await fetch(api.menu.get.path.replace(":id", id.toString()));
        if (res.ok) {
          const data = await res.json();
          return mapMenuItem(data);
        }
      } catch (err) {
        // Express backend not present
      }

      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return mapMenuItem(data);
    },
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
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
      try {
        const res = await fetch(api.menu.create.path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Express backend not present
      }

      // Direct Supabase insert
      const { data: created, error } = await supabase
        .from("menu_items")
        .insert({
          name: data.name,
          description: data.description,
          price: data.price,
          image_url: data.imageUrl,
          category: data.category,
          discount: data.discount ?? 0,
          available: data.available ?? true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapMenuItem(created);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENU_KEY });
    },
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number;
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      category?: string;
      discount?: number;
      available?: boolean;
    }) => {
      try {
        const res = await fetch(`/api/menu/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Express backend not present
      }

      const updatePayload: any = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.price !== undefined) updatePayload.price = data.price;
      if (data.imageUrl !== undefined) updatePayload.image_url = data.imageUrl;
      if (data.category !== undefined) updatePayload.category = data.category;
      if (data.discount !== undefined) updatePayload.discount = data.discount;
      if (data.available !== undefined) updatePayload.available = data.available;

      const { data: updated, error } = await supabase
        .from("menu_items")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return mapMenuItem(updated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENU_KEY });
    },
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      try {
        const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
        if (res.ok) return;
      } catch (err) {
        // Express backend not present
      }

      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENU_KEY });
    },
  });
}
