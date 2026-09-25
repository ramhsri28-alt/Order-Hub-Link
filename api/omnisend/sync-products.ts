import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/omnisend/sync-products
 *
 * One-shot (or cron-able) endpoint that:
 *   1. Fetches all menu items from Supabase
 *   2. Upserts each category into Omnisend's Categories API (/v3/categories)
 *   3. Upserts each product into Omnisend's Products API (/v3/products)
 *
 * This is what populates the Omnisend "Products" section so items appear
 * in email product blocks and segmentation filters.
 *
 * Price conversion: DB stores prices in paisa (e.g. 10000 = Rs. 100).
 * Omnisend expects prices in the smallest unit of the currency.
 * For NPR, we keep paisa as-is (NPR has no sub-unit in practice, but
 * Omnisend treats the value as a decimal — so we divide by 100).
 */

const OMNISEND_BASE = "https://api.omnisend.com/v3";
const SITE_URL = process.env.SITE_URL || "https://hubhungry.vercel.app";

interface MenuItem {
  id: number;
  name: string;
  price: number;       // in paisa
  category: string;
  description: string;
  discount: number;    // percentage 0-100
  available: boolean;
  image_url: string | null;
}

function omniHeaders(apiKey: string) {
  return {
    "X-API-KEY": apiKey,
    "Content-Type": "application/json",
  };
}

/** Derive a URL-safe category ID from a category name */
function categoryId(name: string) {
  return `cat_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

/** Convert paisa → rupees as a float */
function toRupees(paisa: number, discount = 0): number {
  const effective = discount > 0 ? paisa * (1 - discount / 100) : paisa;
  return Number((effective / 100).toFixed(2));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.OMNISEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: "OMNISEND_API_KEY not configured" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: "Supabase env vars missing" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── 1. Fetch all menu items ───────────────────────────────────────────────────
  const { data: items, error: dbErr } = await supabase
    .from("menu_items")
    .select("id, name, price, category, description, discount, available, image_url")
    .order("category")
    .order("name");

  if (dbErr || !items) {
    return res.status(500).json({ success: false, error: dbErr?.message || "No items returned" });
  }

  // ── 2. Build unique category list ────────────────────────────────────────────
  const uniqueCategories = [...new Set((items as MenuItem[]).map((i) => i.category))];

  const categoryResults: { name: string; status: number; ok: boolean }[] = [];

  for (const catName of uniqueCategories) {
    const catPayload = {
      categoryID: categoryId(catName),
      title: catName,
    };

    try {
      const catRes = await fetch(`${OMNISEND_BASE}/categories`, {
        method: "POST",
        headers: omniHeaders(apiKey),
        body: JSON.stringify(catPayload),
      });

      const catBody = await catRes.text();

      const isOk = catRes.ok || catRes.status === 400 || catRes.status === 409;
      if (!isOk) {
        console.warn(`[sync-products] Category "${catName}" → HTTP ${catRes.status}:`, catBody);
      } else {
        console.log(`[sync-products] Category "${catName}" synced/exists (HTTP ${catRes.status})`);
      }

      categoryResults.push({ name: catName, status: catRes.status, ok: isOk });
    } catch (err: any) {
      console.error(`[sync-products] Category "${catName}" network error:`, err?.message);
      categoryResults.push({ name: catName, status: 0, ok: false });
    }
  }

  // ── 3. Upsert each product ───────────────────────────────────────────────────
  const productResults: { id: number; name: string; status: number; ok: boolean }[] = [];

  for (const item of items as MenuItem[]) {
    const priceRupees = toRupees(item.price);
    const salePriceRupees = item.discount > 0 ? toRupees(item.price, item.discount) : undefined;
    const productUrl = `${SITE_URL}/#menu`;

    // Omnisend Products API expects at least one variant
    const productPayload: Record<string, any> = {
      productID: String(item.id),
      title: item.name,
      description: item.description || item.name,
      currency: "NPR",
      url: productUrl,
      productUrl: productUrl,
      categoryIDs: [categoryId(item.category)],
      status: item.available ? "inStock" : "outOfStock",
      variants: [
        {
          variantID: `${item.id}_default`,
          title: item.name,
          sku: `MENU-${item.id}`,
          status: item.available ? "inStock" : "outOfStock",
          price: priceRupees,
          ...(salePriceRupees !== undefined && { salePrice: salePriceRupees }),
          ...(item.image_url ? { imageUrl: item.image_url } : {}),
        },
      ],
    };

    if (item.image_url) {
      productPayload.images = [
        {
          imageID: `img_${item.id}`,
          url: item.image_url,
          isDefault: true,
        },
      ];
    }

    try {
      // Try POST first; if 409 Conflict (already exists), do PUT
      let prodRes = await fetch(`${OMNISEND_BASE}/products`, {
        method: "POST",
        headers: omniHeaders(apiKey),
        body: JSON.stringify(productPayload),
      });

      if (prodRes.status === 409) {
        // Product exists — update it
        prodRes = await fetch(`${OMNISEND_BASE}/products/${item.id}`, {
          method: "PUT",
          headers: omniHeaders(apiKey),
          body: JSON.stringify(productPayload),
        });
      }

      const prodBody = await prodRes.text();
      if (!prodRes.ok) {
        console.warn(`[sync-products] Product "${item.name}" → HTTP ${prodRes.status}:`, prodBody);
      } else {
        console.log(`[sync-products] Product "${item.name}" synced (HTTP ${prodRes.status})`);
      }

      productResults.push({ id: item.id, name: item.name, status: prodRes.status, ok: prodRes.ok });
    } catch (err: any) {
      console.error(`[sync-products] Product "${item.name}" network error:`, err?.message);
      productResults.push({ id: item.id, name: item.name, status: 0, ok: false });
    }
  }

  const successCount = productResults.filter((p) => p.ok).length;
  const failCount = productResults.filter((p) => !p.ok).length;

  console.log(`[sync-products] Done: ${successCount} products synced, ${failCount} failed.`);

  return res.status(200).json({
    success: failCount === 0,
    summary: {
      categoriesSynced: categoryResults.filter((c) => c.ok).length,
      categoriesFailed: categoryResults.filter((c) => !c.ok).length,
      productsSynced: successCount,
      productsFailed: failCount,
    },
    categories: categoryResults,
    products: productResults,
  });
}
