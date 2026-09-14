import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  MenuItem,
  InsertMenuItem,
  CreateOrderRequest,
  OrderWithItems,
  OrderStatus,
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
    // 1. Verify items and calculate total
    let totalAmount = 0;
    const orderItemsData: {
      menuItemId: number;
      quantity: number;
      price: number;
    }[] = [];

    for (const itemRequest of request.items) {
      const { data: menuItem, error } = await getClient()
        .from("menu_items")
        .select("*")
        .eq("id", itemRequest.menuItemId)
        .single();
      if (error || !menuItem) {
        throw new Error(`Menu item ${itemRequest.menuItemId} not found`);
      }
      totalAmount += menuItem.price * itemRequest.quantity;
      orderItemsData.push({
        menuItemId: menuItem.id,
        quantity: itemRequest.quantity,
        price: menuItem.price,
      });
    }

    const bonusPoints = Math.floor(totalAmount / 10000);

    // 2. Insert order
    const { data: newOrder, error: orderError } = await getClient()
      .from("orders")
      .insert({
        order_number: generateOrderNumber(),
        customer_name: request.customerName,
        customer_email: request.customerEmail ?? null,
        customer_phone: request.customerPhone,
        delivery_address: request.deliveryAddress ?? null,
        landmark: request.landmark ?? null,
        latitude: request.latitude ?? null,
        longitude: request.longitude ?? null,
        bonus_points: bonusPoints,
        total_amount: totalAmount,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      throw new Error(orderError?.message ?? "Failed to create order");
    }

    // 3. Insert order items
    const itemsToInsert = orderItemsData.map((item) => ({
      order_id: newOrder.id,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await getClient()
      .from("order_items")
      .insert(itemsToInsert);

    if (itemsError) throw new Error(itemsError.message);

    // 4. Return complete order
    const complete = await this.getOrder(newOrder.id);
    if (!complete) throw new Error("Failed to retrieve created order");
    return complete;
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
