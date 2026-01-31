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
  
  // Orders
  getOrders(): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: CreateOrderRequest): Promise<OrderWithItems>;
  updateOrderStatus(id: number, status: OrderStatus): Promise<OrderWithItems>;
}

export class DatabaseStorage implements IStorage {
  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems).orderBy(menuItems.category, menuItems.name);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
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

      // 2. Create Order
      const [newOrder] = await tx.insert(orders).values({
        orderNumber: generateOrderNumber(),
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        totalAmount,
        status: "pending"
      }).returning();

      // 3. Create Order Items
      for (const itemData of orderItemsData) {
        await tx.insert(orderItems).values({
          orderId: newOrder.id,
          ...itemData
        });
      }

      // 4. Return complete order
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
