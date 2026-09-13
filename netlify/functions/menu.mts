import { getDatabase } from "@netlify/database";
import type { Config, Context } from "@netlify/functions";

type MenuRow = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  discount: number;
  available: boolean;
};

const starterMenu = [
  ["Momo (Steamed)", "Traditional Nepali steamed dumplings filled with spiced chicken.", 25000, "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80", "Starters"],
  ["Fried Momo", "Crispy fried dumplings served with spicy achar.", 28000, "https://images.unsplash.com/photo-1626776877039-31c7aee25804?auto=format&fit=crop&w=800&q=80", "Starters"],
  ["Chowmein", "Stir-fried noodles with vegetables and choice of meat.", 20000, "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80", "Starters"],
  ["Dal Bhat Set", "Traditional Nepali meal with dal, rice, vegetables, and pickle.", 35000, "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800&q=80", "Mains"],
  ["Chicken Biryani", "Aromatic basmati rice cooked with tender chicken and spices.", 40000, "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80", "Mains"],
  ["Masala Tea", "Traditional spiced milk tea.", 5000, "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=800&q=80", "Drinks"],
  ["Lassi", "Refreshing yogurt-based drink, sweet or salty.", 8000, "https://images.unsplash.com/photo-1626204174671-ab34d800e28e?auto=format&fit=crop&w=800&q=80", "Drinks"],
  ["Juju Dhau", "Famous Bhaktapur king curd, creamy and sweet.", 12000, "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80", "Desserts"],
] as const;

function toMenuItem(row: MenuRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    category: row.category,
    discount: row.discount,
    available: row.available,
  };
}

function validId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function handler(req: Request, context: Context) {
  const db = getDatabase();
  const id = validId(context.params.id);

  try {
    if (req.method === "GET" && id === null && context.params.id) {
      return Response.json({ message: "Invalid menu item id" }, { status: 400 });
    }

    if (req.method === "GET" && id !== null) {
      const rows = await db.sql<MenuRow>`SELECT * FROM menu_items WHERE id = ${id}`;
      return rows[0]
        ? Response.json(toMenuItem(rows[0]))
        : Response.json({ message: "Item not found" }, { status: 404 });
    }

    if (req.method === "GET") {
      let rows = await db.sql<MenuRow>`SELECT * FROM menu_items ORDER BY category, name`;

      if (rows.length === 0) {
        for (const [name, description, price, imageUrl, category] of starterMenu) {
          await db.sql`
            INSERT INTO menu_items (name, description, price, image_url, category)
            VALUES (${name}, ${description}, ${price}, ${imageUrl}, ${category})
          `;
        }
        rows = await db.sql<MenuRow>`SELECT * FROM menu_items ORDER BY category, name`;
      }

      return Response.json(rows.map(toMenuItem));
    }

    if (req.method === "POST") {
      const body = await req.json() as Partial<ReturnType<typeof toMenuItem>>;
      if (!body.name || !body.description || !body.price || !body.imageUrl || !body.category) {
        return Response.json({ message: "All menu item fields are required" }, { status: 400 });
      }
      const rows = await db.sql<MenuRow>`
        INSERT INTO menu_items (name, description, price, image_url, category, discount, available)
        VALUES (${body.name}, ${body.description}, ${body.price}, ${body.imageUrl}, ${body.category}, ${body.discount ?? 0}, ${body.available ?? true})
        RETURNING *
      `;
      return Response.json(toMenuItem(rows[0]), { status: 201 });
    }

    if ((req.method === "PATCH" || req.method === "DELETE") && id === null) {
      return Response.json({ message: "Invalid menu item id" }, { status: 400 });
    }

    if (req.method === "PATCH") {
      const body = await req.json() as Partial<ReturnType<typeof toMenuItem>>;
      const current = await db.sql<MenuRow>`SELECT * FROM menu_items WHERE id = ${id!}`;
      if (!current[0]) return Response.json({ message: "Menu item not found" }, { status: 404 });
      const item = { ...toMenuItem(current[0]), ...body };
      const rows = await db.sql<MenuRow>`
        UPDATE menu_items SET name = ${item.name}, description = ${item.description}, price = ${item.price},
          image_url = ${item.imageUrl}, category = ${item.category}, discount = ${item.discount}, available = ${item.available}
        WHERE id = ${id!} RETURNING *
      `;
      return Response.json(toMenuItem(rows[0]));
    }

    if (req.method === "DELETE") {
      const rows = await db.sql<MenuRow>`DELETE FROM menu_items WHERE id = ${id!} RETURNING *`;
      return rows[0]
        ? new Response(null, { status: 204 })
        : Response.json({ message: "Menu item not found" }, { status: 404 });
    }

    return Response.json({ message: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Menu API error", error);
    return Response.json({ message: "Unable to load menu" }, { status: 500 });
  }
}

export const config: Config = {
  path: ["/api/menu", "/api/menu/:id"],
};
