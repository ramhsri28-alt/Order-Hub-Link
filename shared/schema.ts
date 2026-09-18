import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // In paisa
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(),
  discount: integer("discount").default(0).notNull(), // Discount percentage (0-100)
  available: boolean("available").default(true).notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(), // Human-readable order number like ORD-001
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  deliveryAddress: text("delivery_address"),
  landmark: text("landmark"),
  latitude: text("latitude"), // GPS latitude for map pin
  longitude: text("longitude"), // GPS longitude for map pin
  bonusPoints: integer("bonus_points").default(0).notNull(), // Bonus points earned for this order
  status: text("status").notNull().default("pending"), // pending, preparing, ready, delivered, cancelled
  totalAmount: integer("total_amount").notNull(), // In paisa (Nepali currency)
  subtotalAmount: integer("subtotal_amount"), // In paisa before coupon discount
  discountAmount: integer("discount_amount").default(0).notNull(), // In paisa
  couponCode: text("coupon_code"),
  userId: uuid("user_id"),
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
  deliveryAddress?: string;
  landmark?: string;
  latitude?: string;
  longitude?: string;
  couponCode?: string;
  userId?: string;
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

// === COUPON REDEMPTIONS ===
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponCode: text("coupon_code").notNull(),
  userId: uuid("user_id").notNull(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  discountAmount: integer("discount_amount").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CouponRedemption = typeof couponRedemptions.$inferSelect;

export type CouponEligibilityResult = {
  eligible: boolean;
  code: "ELIGIBLE" | "AUTH_REQUIRED" | "NOT_FIRST_ORDER" | "ALREADY_REDEEMED" | "INVALID_COUPON";
  message: string;
  discount_percent?: number;
};

// === CUSTOMER PROFILES (for sign-up data: name, phone, email) ===
export const customerProfiles = pgTable("customer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull().default(""),
  phoneNumber: text("phone_number").notNull().default(""),
  omnisendWelcomeTriggeredAt: timestamp("omnisend_welcome_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerProfileSchema = createInsertSchema(customerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type InsertCustomerProfile = z.infer<typeof insertCustomerProfileSchema>;

