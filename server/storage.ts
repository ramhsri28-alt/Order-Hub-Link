import { db } from "./db";
import {
  menuItems,
  orders,
  orderItems,
  type MenuItem,
  type InsertMenuItem,
  type CreateOrderRequest,
  type OrderWithItems,
  type OrderStatus
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${dateStr}-${random}`;
}

export interface IStorage {
  // Menu
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  
  // Orders
  getOrders(): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: CreateOrderRequest): Promise<OrderWithItems>;
  updateOrderStatus(id: number, status: OrderStatus): Promise<OrderWithItems>;
}

export class DatabaseStorage implements IStorage {
  async getMenuItems(): Promise<MenuItem[]> {
    try {
      return await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
    } catch (e) {
      console.warn('DB error (getMenuItems):', e);
      return [];
    }
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updated] = await db.update(menuItems).set(item).where(eq(menuItems.id, id)).returning();
    if (!updated) throw new Error("Menu item not found");
    return updated;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async getOrders(): Promise<OrderWithItems[]> {
    const allOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      with: {
        items: {
          with: {
            menuItem: true
          }
        }
      }
    });
    return allOrders;
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: {
          with: {
            menuItem: true
          }
        }
      }
    });
    return order;
  }

  async createOrder(request: CreateOrderRequest): Promise<OrderWithItems> {
    return await db.transaction(async (tx) => {
      // 1. Calculate total and verify items
      let totalAmount = 0;
      const orderItemsData = [];

      for (const itemRequest of request.items) {
        const [menuItem] = await tx
          .select()
          .from(menuItems)
          .where(eq(menuItems.id, itemRequest.menuItemId));

        if (!menuItem) {
          throw new Error(`Menu item ${itemRequest.menuItemId} not found`);
        }

        totalAmount += menuItem.price * itemRequest.quantity;
        orderItemsData.push({
          menuItemId: menuItem.id,
          quantity: itemRequest.quantity,
          price: menuItem.price
        });
      }

      // 2. Calculate bonus points (1 point per 100 rupees spent)
      const bonusPoints = Math.floor(totalAmount / 10000);

      // 3. Create Order
      const [newOrder] = await tx.insert(orders).values({
        orderNumber: generateOrderNumber(),
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        deliveryAddress: request.deliveryAddress,
        landmark: request.landmark,
        latitude: request.latitude,
        longitude: request.longitude,
        bonusPoints,
        totalAmount,
        status: "pending"
      }).returning();

      // 4. Create Order Items
      for (const itemData of orderItemsData) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          ...itemData
        });
      }

      // 5. Return complete order
      const completeOrder = await tx.query.orders.findFirst({
        where: eq(orders.id, newOrder.id),
        with: {
          items: {
            with: {
              menuItem: true
            }
          }
        }
      });

      if (!completeOrder) throw new Error("Failed to create order");
      return completeOrder;
    });
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<OrderWithItems> {
    await db.update(orders)
      .set({ status })
      .where(eq(orders.id, id));

    const updated = await this.getOrder(id);
    if (!updated) throw new Error("Order not found");
    return updated;
  }
}

export const storage = new DatabaseStorage();
