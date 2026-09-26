import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendOmnisendFirstLoginEvent } from "./omnisend";
import { sendPlacedOrderEvent } from "../api/lib/omnisend-events";

let _authClient: SupabaseClient | null = null;
function getAuthClient(): SupabaseClient {
  if (!_authClient) {
    const url = process.env.VITE_SUPABASE_URL || "";
    const key = process.env.VITE_SUPABASE_ANON_KEY || "";
    _authClient = createClient(url, key);
  }
  return _authClient;
}

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await getAuthClient().auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
  
  const isAdmin = user.email === 'hungryhub@gmail.com' || user.user_metadata?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === MENU ROUTES ===
  app.get(api.menu.list.path, async (req, res) => {
    const items = await storage.getMenuItems();
    res.json(items);
  });

  app.get(api.menu.get.path, async (req, res) => {
    const item = await storage.getMenuItem(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  });

  app.post(api.menu.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.menu.create.input.parse(req.body);
      const item = await storage.createMenuItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.menu.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.menu.update.input.parse(req.body);
      const item = await storage.updateMenuItem(Number(req.params.id), input);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      res.status(404).json({ message: "Menu item not found" });
    }
  });

  app.delete(api.menu.delete.path, requireAdmin, async (req, res) => {
    try {
      await storage.deleteMenuItem(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(404).json({ message: "Menu item not found" });
    }
  });

  // === ORDER ROUTES ===
  app.get(api.orders.list.path, requireAdmin, async (req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get(api.orders.get.path, async (req, res) => {
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);

      // If userId not provided in body, extract from auth token
      if (!input.userId && req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace("Bearer ", "");
          const { data: { user } } = await getAuthClient().auth.getUser(token);
          if (user) {
            input.userId = user.id;
          }
        } catch {}
      }

      const order = await storage.createOrder(input);
      res.status(201).json(order);

      // ── Fire "placed order" event to Omnisend (server-side, non-blocking) ──
      // Runs after the response is sent so it never delays the customer.
      // Requires a valid customer email — orders without email skip silently.
      const customerEmail = (input.customerEmail || "").trim().toLowerCase();
      if (customerEmail) {
        const lineItems = (order.items || []).map((orderItem) => ({
          productID: String(orderItem.menuItemId),
          productTitle: orderItem.menuItem?.name || "Menu Item",
          // price stored in paisa → convert to rupees
          productPrice: Number((orderItem.price / 100).toFixed(2)),
          productQuantity: orderItem.quantity,
        }));

        sendPlacedOrderEvent({
          email: customerEmail,
          orderID: String(order.id),
          // totalAmount stored in paisa → convert to rupees
          totalPrice: Number((order.totalAmount / 100).toFixed(2)),
          currency: "NPR",
          lineItems,
        }).catch((err) => {
          console.error("[Routes] Omnisend placed order event error (non-fatal):", err?.message);
        });
      } else {
        console.log("[Routes] Omnisend placed order skipped — no customer email on order", order.id);
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      return res.status(400).json({
        message: err?.message || "Failed to place order",
      });
    }
  });

  // === COUPON VALIDATION ROUTE ===
  app.post(api.coupons.validate.path, async (req, res) => {
    try {
      const input = api.coupons.validate.input.parse(req.body);
      let userId = input.userId;

      if (!userId && req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace("Bearer ", "");
          const { data: { user } } = await getAuthClient().auth.getUser(token);
          if (user) userId = user.id;
        } catch {}
      }

      const result = await storage.validateCoupon(
        input.code,
        userId,
        input.email,
        input.phone
      );
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      return res.status(400).json({
        message: err?.message || "Failed to validate coupon",
      });
    }
  });

  app.patch(api.orders.updateStatus.path, requireAdmin, async (req, res) => {
    try {
      const { status } = api.orders.updateStatus.input.parse(req.body);
      const order = await storage.updateOrderStatus(Number(req.params.id), status);
      res.json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      res.status(404).json({ message: "Order not found" });
    }
  });

  // === OMNISEND SUBSCRIBER SYNC ===
  app.post("/api/subscribe", async (req, res) => {
    try {
      const { email, phone, firstName, lastName, fullName } = req.body || {};

      if (!email && !phone) {
        return res.status(400).json({ message: "Email or phone is required" });
      }

      const apiKey = process.env.OMNISEND_API_KEY;
      if (!apiKey) {
        console.warn("[Omnisend Server] OMNISEND_API_KEY is missing from environment variables.");
        return res.status(500).json({ message: "Server configuration error: missing OMNISEND_API_KEY" });
      }

      const fName = firstName || (fullName ? fullName.split(" ")[0] : "");
      const lName = lastName || (fullName ? fullName.split(" ").slice(1).join(" ") : "");

      const identifiers: Array<Record<string, any>> = [];
      if (email) {
        identifiers.push({
          type: "email",
          id: email.trim(),
          channels: {
            email: {
              status: "subscribed",
            },
          },
        });
      }

      if (phone) {
        identifiers.push({
          type: "phone",
          id: phone.trim(),
          channels: {
            sms: {
              status: "subscribed",
            },
          },
        });
      }

      const payload: Record<string, any> = {
        identifiers,
        sendWelcomeEmail: false,
      };

      if (fName) payload.firstName = fName;
      if (lName) payload.lastName = lName;

      const response = await fetch("https://api.omnisend.com/v3/contacts", {
        method: "POST",
        headers: {
          Authorization: `Omnisend-API-Key ${apiKey}`,
          "Omnisend-Version": "2026-03-15",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn("[Omnisend Server] Contact sync response warning:", response.status, data);
        return res.status(response.status).json({ success: false, error: data });
      }

      console.log("[Omnisend Server] Contact synced successfully:", email || phone);
      return res.status(200).json({ success: true, contact: data });
    } catch (err: any) {
      console.error("[Omnisend Server] Contact sync error:", err);
      return res.status(500).json({ message: "Failed to sync contact with Omnisend", error: err?.message });
    }
  });

  // === OMNISEND FIRST LOGIN CUSTOM EVENT ROUTE ===
  const handleFirstLogin = async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Authorization token required" });
      }

      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      const {
        data: { user },
        error: userError,
      } = await getAuthClient().auth.getUser(token);

      if (userError || !user) {
        return res.status(401).json({ message: "Invalid or expired session token" });
      }

      const body = req.body || {};
      const email = (user.email || body.email || "").trim().toLowerCase();
      const fullName = (body.fullName || user.user_metadata?.full_name || "").trim();
      const phone = (body.phone || user.user_metadata?.phone || "").trim();

      // Atomic claim via Supabase RPC (locks and updates database row)
      const claimResult = await storage.claimFirstLoginWelcome(
        user.id,
        email,
        fullName,
        phone
      );

      if (!claimResult.claimed) {
        // Already triggered previously! Do NOT send the event again
        return res.status(200).json({
          success: true,
          triggered: false,
          reason: claimResult.reason || "already_triggered",
          triggeredAt: claimResult.triggeredAt,
        });
      }

      // First qualifying login! Dispatch new_customer_first_login custom event to Omnisend
      const omnisendResult = await sendOmnisendFirstLoginEvent({
        userId: user.id,
        email,
        fullName,
        phone,
        couponCode: "WELCOME20",
      });

      return res.status(200).json({
        success: true,
        triggered: true,
        omnisend: omnisendResult,
      });
    } catch (err: any) {
      console.error("[Omnisend Route] Error in first-login handler:", err);
      return res.status(500).json({
        message: "Failed to process first login",
        error: err?.message,
      });
    }
  };

  app.post("/api/omnisend/first-login", handleFirstLogin);
  app.post("/api/first-login", handleFirstLogin);

  // Seed Data
  try {
    await seedDatabase();
  } catch (e) {
    console.warn('Seeding skipped due to DB error:', e);
  }

  return httpServer;
}

async function seedDatabase() {
  const existingItems = await storage.getMenuItems();
  if (existingItems.length === 0) {
    console.log("Seeding database with Nepali dishes...");
    const menuItems = [
      // Starters
      {
        name: "Momo (Steamed)",
        description: "Traditional Nepali steamed dumplings filled with spiced chicken.",
        price: 25000, // Rs. 250
        category: "Starters",
        imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Fried Momo",
        description: "Crispy fried dumplings served with spicy achar.",
        price: 28000, // Rs. 280
        category: "Starters",
        imageUrl: "https://images.unsplash.com/photo-1626776877039-31c7aee25804?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Chowmein",
        description: "Stir-fried noodles with vegetables and choice of meat.",
        price: 20000, // Rs. 200
        category: "Starters",
        imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      // Mains
      {
        name: "Dal Bhat Set",
        description: "Traditional Nepali meal with dal, rice, vegetables, and pickle.",
        price: 35000, // Rs. 350
        category: "Mains",
        imageUrl: "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Chicken Biryani",
        description: "Aromatic basmati rice cooked with tender chicken and spices.",
        price: 40000, // Rs. 400
        category: "Mains",
        imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Butter Chicken",
        description: "Creamy tomato-based curry with tender chicken pieces.",
        price: 45000, // Rs. 450
        category: "Mains",
        imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Sekuwa",
        description: "Nepali-style grilled meat with traditional spices.",
        price: 50000, // Rs. 500
        category: "Mains",
        imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Thukpa",
        description: "Tibetan noodle soup with vegetables and meat.",
        price: 22000, // Rs. 220
        category: "Mains",
        imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      // Drinks
      {
        name: "Masala Tea",
        description: "Traditional spiced milk tea.",
        price: 5000, // Rs. 50
        category: "Drinks",
        imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Lassi",
        description: "Refreshing yogurt-based drink, sweet or salty.",
        price: 8000, // Rs. 80
        category: "Drinks",
        imageUrl: "https://images.unsplash.com/photo-1626204174671-ab34d800e28e?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Fresh Lemon Soda",
        description: "Refreshing lime juice with soda water.",
        price: 6000, // Rs. 60
        category: "Drinks",
        imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      // Desserts
      {
        name: "Juju Dhau",
        description: "Famous Bhaktapur king curd, creamy and sweet.",
        price: 12000, // Rs. 120
        category: "Desserts",
        imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Gulab Jamun",
        description: "Soft milk dumplings soaked in sweet syrup.",
        price: 10000, // Rs. 100
        category: "Desserts",
        imageUrl: "https://images.unsplash.com/photo-1601303516527-d5a66de44e74?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Kheer",
        description: "Creamy rice pudding with cardamom and nuts.",
        price: 8000, // Rs. 80
        category: "Desserts",
        imageUrl: "https://images.unsplash.com/photo-1517244683847-7456b63c5969?auto=format&fit=crop&w=800&q=80",
        available: true
      }
    ];

    for (const item of menuItems) {
      await storage.createMenuItem(item);
    }
    console.log("Seeding complete!");
  }
}
