import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { sendWhatsAppNotification } from "./whatsapp";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

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

  // === ORDER ROUTES ===
  app.get(api.orders.list.path, async (req, res) => {
    // In a real app, check for admin auth here
    // if (!req.isAuthenticated()) return res.status(401).send();
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder(input);
      
      // Send WhatsApp notification
      sendWhatsAppNotification(order);
      
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Handle custom errors from storage (e.g. item not found)
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }
  });

  app.patch(api.orders.updateStatus.path, async (req, res) => {
    // In a real app, verify admin authentication here

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

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingItems = await storage.getMenuItems();
  if (existingItems.length === 0) {
    console.log("Seeding database...");
    const menuItems = [
      {
        name: "Classic Burger",
        description: "Juicy beef patty with lettuce, tomato, and secret sauce.",
        price: 1299,
        category: "Mains",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Margherita Pizza",
        description: "Fresh basil, mozzarella, and san marzano tomato sauce.",
        price: 1499,
        category: "Mains",
        imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Caesar Salad",
        description: "Crisp romaine, parmesan cheese, croutons, and caesar dressing.",
        price: 899,
        category: "Starters",
        imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80",
        available: true
      },
      {
        name: "Tiramisu",
        description: "Classic Italian dessert with coffee-soaked ladyfingers.",
        price: 699,
        category: "Desserts",
        imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
        available: true
      }
    ];

    for (const item of menuItems) {
      await storage.createMenuItem(item);
    }
    console.log("Seeding complete!");
  }
}
