import type { VercelRequest, VercelResponse } from "@vercel/node";

// Inline Omnisend call — no cross-directory import so Vercel can bundle correctly
async function fireOmnisendAddedToCart(payload: {
  email: string;
  value: number;
  currency: string;
  lineItems: { productID?: string; productTitle: string; productPrice: number; productQuantity: number }[];
}): Promise<{ success: boolean; status?: number; error?: string }> {
  const apiKey = process.env.OMNISEND_API_KEY;
  if (!apiKey) return { success: false, error: "OMNISEND_API_KEY not set" };
  try {
    const res = await fetch("https://api.omnisend.com/api/events", {
      method: "POST",
      headers: {
        Authorization: `Omnisend-API-Key ${apiKey}`,
        "Omnisend-Version": "2026-03-15",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName: "added product to cart",
        origin: "api",
        contact: { email: payload.email },
        properties: {
          value: payload.value,
          currency: payload.currency,
          lineItems: payload.lineItems,
        },
      }),
    });
    if (res.ok) return { success: true, status: res.status };
    const err = await res.text();
    return { success: false, status: res.status, error: err };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

/**
 * POST /api/omnisend/added-to-cart
 *
 * Fires the "added product to cart" ecommerce event to Omnisend Events API
 * with origin: "api". This is the ONLY way to satisfy an Omnisend automation
 * trigger that is set to "added product to cart (origin: api)".
 *
 * The browser JS snippet sends origin: "web", which does NOT match.
 * This server-side endpoint fixes that.
 *
 * Called from use-cart.ts → addItem whenever a logged-in user adds to cart.
 */

interface AddToCartBody {
  email: string;
  currency?: string;
  value?: number;
  lineItems?: {
    productID?: string;
    productTitle: string;
    productPrice: number;
    productQuantity: number;
  }[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const body = (req.body || {}) as AddToCartBody;
    const email = (body.email || "").trim().toLowerCase();
    const currency = (body.currency || "NPR").trim().toUpperCase();
    const value = Number(body.value ?? 0);
    const lineItems = (body.lineItems || []).map((item) => ({
      productID: item.productID,
      productTitle: item.productTitle || "Product",
      productPrice: Number(item.productPrice ?? 0),
      productQuantity: Number(item.productQuantity ?? 1),
    }));

    if (!email) {
      // No email = can't fire a server-side event; return silently so UI is never blocked
      return res.status(200).json({ success: false, skipped: true, reason: "no email" });
    }

    // Always returns 200 so the client is never blocked
    const result = await fireOmnisendAddedToCart({ email, value, currency, lineItems });

    return res.status(200).json({
      success: result.success,
      status: result.status,
      error: result.error,
    });
  } catch (err: any) {
    console.error("[added-to-cart] Unhandled error:", err?.message);
    return res.status(200).json({ success: false, error: err?.message });
  }
}
