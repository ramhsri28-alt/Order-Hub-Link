import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // In cents
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  available: boolean("available").default(true).notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(), // Human-readable order number like ORD-001
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  status: text("status").notNull().default("pending"), // pending, preparing, ready, delivered, cancelled
  totalAmount: integer("total_amount").notNull(), // In cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(), // Price at time of order in cents
});

// === RELATIONS ===
export const orderRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, status: true, totalAmount: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

// Menu Types
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

// Order Types
export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled";
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect & { menuItem?: MenuItem }; // Include nested item for display

// Composite Order type for API responses
export type OrderWithItems = Order & {
  items: (OrderItem & { menuItem: MenuItem })[];
};

// API Request Types
export type CreateOrderRequest = {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  items: {
    menuItemId: number;
    quantity: number;
  }[];
};

export type UpdateOrderStatusRequest = {
  status: OrderStatus;
};

// API Response Types
export type MenuItemResponse = MenuItem;
export type OrderResponse = OrderWithItems;
