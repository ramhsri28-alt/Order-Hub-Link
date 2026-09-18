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
        subtotalAmount: order.subtotal_amount,
        discountAmount: order.discount_amount ?? 0,
        couponCode: order.coupon_code,
        userId: order.user_id,
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
      // 1. Try Express API if server is active
      try {
        const { data: authData } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (authData?.session?.access_token) {
          headers["Authorization"] = `Bearer ${authData.session.access_token}`;
        }

        const res = await fetch(api.orders.create.path, {
          method: api.orders.create.method,
          headers,
          body: JSON.stringify(data),
        });

        if (res.ok) {
          return (await res.json()) as OrderWithItems;
        } else if (res.status === 400) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to create order");
        }
      } catch (err: any) {
        if (err?.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
          throw err;
        }
        // Express backend not present or unreachable; proceed to Supabase RPC
      }

      // 2. Direct Supabase atomic RPC execution
      const { data: authData } = await supabase.auth.getSession();
      const userId = data.userId || authData?.session?.user?.id || null;

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "place_order_with_coupon",
        {
          p_customer_name: data.customerName,
          p_customer_phone: data.customerPhone,
          p_items: data.items,
          p_customer_email: data.customerEmail || null,
          p_delivery_address: data.deliveryAddress || null,
          p_landmark: data.landmark || null,
          p_latitude: data.latitude || null,
          p_longitude: data.longitude || null,
          p_coupon_code: data.couponCode || null,
          p_user_id: userId,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const orderId = rpcResult?.orderId;
      if (!orderId) {
        throw new Error("Failed to place order.");
      }

      const { data: fetchedOrder, error: fetchErr } = await supabase
        .from("orders")
        .select(`
          *,
          items:order_items (
            *,
            menuItem:menu_items (*)
          )
        `)
        .eq("id", orderId)
        .single();

      if (fetchErr || !fetchedOrder) {
        return rpcResult.order as unknown as OrderWithItems;
      }

      return {
        id: fetchedOrder.id,
        orderNumber: fetchedOrder.order_number,
        customerName: fetchedOrder.customer_name,
        customerEmail: fetchedOrder.customer_email,
        customerPhone: fetchedOrder.customer_phone,
        deliveryAddress: fetchedOrder.delivery_address,
        landmark: fetchedOrder.landmark,
        latitude: fetchedOrder.latitude,
        longitude: fetchedOrder.longitude,
        bonusPoints: fetchedOrder.bonus_points ?? 0,
        status: fetchedOrder.status,
        totalAmount: fetchedOrder.total_amount,
        subtotalAmount: fetchedOrder.subtotal_amount,
        discountAmount: fetchedOrder.discount_amount ?? 0,
        couponCode: fetchedOrder.coupon_code,
        userId: fetchedOrder.user_id,
        createdAt: new Date(fetchedOrder.created_at),
        items: (fetchedOrder.items ?? []).map((oi: any) => ({
          id: oi.id,
          orderId: oi.order_id,
          menuItemId: oi.menu_item_id,
          quantity: oi.quantity,
          price: oi.price,
          menuItem: oi.menuItem,
        })),
      } as unknown as OrderWithItems;
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
