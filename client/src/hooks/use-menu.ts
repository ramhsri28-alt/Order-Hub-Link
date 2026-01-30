import { useQuery } from "@tanstack/react-query";
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
