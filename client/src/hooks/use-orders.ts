import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { 
  CreateOrderRequest, 
  UpdateOrderStatusRequest, 
  OrderWithItems 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return await res.json() as OrderWithItems[];
    },
    // Poll every 10 seconds for new orders in the dashboard
    refetchInterval: 10000, 
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create order");
      }
      return await res.json() as OrderWithItems;
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
      const url = buildUrl(api.orders.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.orders.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to update status");
      return await res.json();
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
