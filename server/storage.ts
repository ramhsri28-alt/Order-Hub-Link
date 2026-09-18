import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  MenuItem,
  InsertMenuItem,
  CreateOrderRequest,
  OrderWithItems,
  OrderStatus,
  CouponEligibilityResult,
} from "@shared/schema";

// Lazy singleton — created on first use so dotenv.config() has already run
let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)"
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `ORD-${dateStr}-${random}`;
}

export interface IStorage {
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  getOrders(): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: CreateOrderRequest): Promise<OrderWithItems>;
  updateOrderStatus(id: number, status: OrderStatus): Promise<OrderWithItems>;
  validateCoupon(code: string, userId?: string, email?: string, phone?: string): Promise<CouponEligibilityResult>;
}

export class SupabaseStorage implements IStorage {
  async getMenuItems(): Promise<MenuItem[]> {
    const { data, error } = await getClient()
      .from("menu_items")
      .select("*")
      .order("category")
      .order("name");
    if (error) {
      console.warn("getMenuItems error:", error.message);
      return [];
    }
    return data ?? [];
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const { data, error } = await getClient()
      .from("menu_items")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return undefined;
    return data ?? undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const { data, error } = await getClient()
      .from("menu_items")
      .insert(item)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateMenuItem(
    id: number,
    item: Partial<InsertMenuItem>
  ): Promise<MenuItem> {
    const { data, error } = await getClient()
      .from("menu_items")
      .update(item)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error("Menu item not found");
    return data;
  }

  async deleteMenuItem(id: number): Promise<void> {
    const { error } = await getClient()
      .from("menu_items")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async getOrders(): Promise<OrderWithItems[]> {
    const { data, error } = await getClient()
      .from("orders")
      .select(`*, items:order_items(*, menuItem:menu_items(*))`)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("getOrders error:", error.message);
      return [];
    }
    return (data ?? []) as OrderWithItems[];
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const { data, error } = await getClient()
      .from("orders")
      .select(`*, items:order_items(*, menuItem:menu_items(*))`)
      .eq("id", id)
      .single();
    if (error) return undefined;
    return data as OrderWithItems;
  }

  async createOrder(request: CreateOrderRequest): Promise<OrderWithItems> {
    const { data: rpcResult, error: rpcError } = await getClient().rpc(
      "place_order_with_coupon",
      {
        p_customer_name: request.customerName,
        p_customer_phone: request.customerPhone,
        p_items: request.items,
        p_customer_email: request.customerEmail || null,
        p_delivery_address: request.deliveryAddress || null,
        p_landmark: request.landmark || null,
        p_latitude: request.latitude || null,
        p_longitude: request.longitude || null,
        p_coupon_code: request.couponCode || null,
        p_user_id: request.userId || null,
      }
    );

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    const orderId = rpcResult?.orderId;
    if (!orderId) {
      throw new Error("Failed to create order");
    }

    const complete = await this.getOrder(orderId);
    if (!complete) throw new Error("Failed to retrieve created order");
    return complete;
  }

  async validateCoupon(
    code: string,
    userId?: string,
    email?: string,
    phone?: string
  ): Promise<CouponEligibilityResult> {
    const cleanCode = code.toUpperCase().trim();
    if (cleanCode !== "WELCOME20") {
      return {
        eligible: false,
        code: "INVALID_COUPON",
        message: "Invalid coupon code.",
      };
    }

    const { data, error } = await getClient().rpc(
      "check_welcome_coupon_eligibility",
      {
        p_user_id: userId || null,
        p_email: email || null,
        p_phone: phone || null,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return data as CouponEligibilityResult;
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus
  ): Promise<OrderWithItems> {
    const { error } = await getClient()
      .from("orders")
      .update({ status })
      .eq("id", id);
    if (error) throw new Error("Order not found");
    const updated = await this.getOrder(id);
    if (!updated) throw new Error("Order not found");
    return updated;
  }
}

export const storage = new SupabaseStorage();
