import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendAddedToCartEvent } from "../lib/omnisend-events";

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
    const result = await sendAddedToCartEvent({ email, value, currency, lineItems });

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
