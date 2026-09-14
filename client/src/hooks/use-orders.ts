import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { 
  CreateOrderRequest, 
  UpdateOrderStatusRequest, 
  OrderWithItems 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      // 1. Try Express API if server is running
      try {
        const res = await fetch(api.orders.list.path, { credentials: "include" });
        if (res.ok) {
          return (await res.json()) as OrderWithItems[];
        }
      } catch (err) {
        // Express backend not present
      }

      // 2. Direct Supabase query (works on Vercel & GitHub Pages)
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          items:order_items (
            *,
            menuItem:menu_items (*)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        deliveryAddress: order.delivery_address,
        landmark: order.landmark,
        latitude: order.latitude,
        longitude: order.longitude,
        bonusPoints: order.bonus_points ?? 0,
        status: order.status,
        totalAmount: order.total_amount,
        createdAt: new Date(order.created_at),
        items: (order.items ?? []).map((oi: any) => ({
          id: oi.id,
          orderId: oi.order_id,
          menuItemId: oi.menu_item_id,
          quantity: oi.quantity,
          price: oi.price,
          menuItem: oi.menuItem ? {
            id: oi.menuItem.id,
            name: oi.menuItem.name,
            description: oi.menuItem.description,
            price: oi.menuItem.price,
            imageUrl: oi.menuItem.image_url ?? oi.menuItem.imageUrl,
            category: oi.menuItem.category,
            discount: oi.menuItem.discount ?? 0,
            available: oi.menuItem.available ?? true,
          } : undefined,
        })),
      })) as OrderWithItems[];
    },
    refetchInterval: 10000, 
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      // 1. Try Express API
      try {
        const res = await fetch(api.orders.create.path, {
          method: api.orders.create.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          return (await res.json()) as OrderWithItems;
        }
      } catch (err) {
        // Express backend not present
      }

      // 2. Direct Supabase order creation
      let totalAmount = 0;
      const itemsToInsert: { menuItemId: number; quantity: number; price: number }[] = [];

      for (const item of data.items) {
        const { data: mi } = await supabase
          .from("menu_items")
          .select("*")
          .eq("id", item.menuItemId)
          .single();

        const price = mi?.price ?? 0;
        totalAmount += price * item.quantity;
        itemsToInsert.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price,
        });
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      const orderNumber = `ORD-${dateStr}-${random}`;

      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_name: data.customerName,
          customer_email: data.customerEmail ?? null,
          customer_phone: data.customerPhone,
          delivery_address: data.deliveryAddress ?? null,
          landmark: data.landmark ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          bonus_points: Math.floor(totalAmount / 10000),
          status: "pending",
          total_amount: totalAmount,
        })
        .select()
        .single();

      if (orderErr) throw new Error(orderErr.message);

      if (itemsToInsert.length > 0) {
        await supabase.from("order_items").insert(
          itemsToInsert.map(oi => ({
            order_id: newOrder.id,
            menu_item_id: oi.menuItemId,
            quantity: oi.quantity,
            price: oi.price,
          }))
        );
      }

      return newOrder as unknown as OrderWithItems;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({
        title: "Order Placed!",
        description: "We've received your order and will start preparing it soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number } & UpdateOrderStatusRequest) => {
      // 1. Try Express API
      try {
        const url = buildUrl(api.orders.updateStatus.path, { id });
        const res = await fetch(url, {
          method: api.orders.updateStatus.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
          credentials: "include",
        });

        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        // Express backend not present
      }

      // 2. Direct Supabase update
      const { data: updated, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({
        title: "Status Updated",
        description: "Order status has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
