import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized: Missing token" });
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
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
    // Admin auth verified by middleware
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder(input);
      
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

  app.patch(api.orders.updateStatus.path, requireAdmin, async (req, res) => {
    // Admin auth verified by middleware
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
      {
        name: "Spring Rolls",
        description: "Crispy vegetable rolls with sweet chili sauce.",
        price: 18000, // Rs. 180
        category: "Starters",
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
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
        name: "Fresh Lime Soda",
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
