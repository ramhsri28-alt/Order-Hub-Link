import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendStartedCheckoutEvent } from "../lib/omnisend-events";

/**
 * POST /api/omnisend/started-checkout
 *
 * Fires the "started checkout" ecommerce event to Omnisend Events API.
 * Called from:
 *   1. checkout-dialog.tsx — when the checkout dialog is opened by the user
 *   2. recover-cart.ts — when a user lands on /recover-cart?token=... (cart recovery)
 *
 * This event registers in the Omnisend Automation editor as a standard
 * ecommerce trigger (unlike client-side JS snippet calls).
 */

interface CartLineItem {
  id?: number | string;
  name?: string;
  productTitle?: string;
  price: number;           // already converted to currency units (NOT paisa)
  productPrice?: number;
  quantity: number;
  productQuantity?: number;
}

interface StartedCheckoutBody {
  email: string;
  cartId?: string;
  cartID?: string;
  value?: number;        // total cart value in currency units (NOT paisa)
  total?: number;        // alias for value
  currency?: string;
  abandonedCheckoutURL?: string;
  recoveryUrl?: string;  // alias for abandonedCheckoutURL
  lineItems?: CartLineItem[];
  items?: CartLineItem[]; // alias for lineItems
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const body = (req.body || {}) as StartedCheckoutBody;

    // Resolve field aliases
    const email = (body.email || "").trim().toLowerCase();
    const cartID = body.cartId || body.cartID || "";
    const currency = (body.currency || "NPR").trim().toUpperCase();
    const value = Number(body.value ?? body.total ?? 0);
    const checkoutURL = body.abandonedCheckoutURL || body.recoveryUrl || "";
    const rawItems: CartLineItem[] = body.lineItems || body.items || [];

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required in the request body",
      });
    }

    if (currency.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "currency must be a valid 3-letter ISO code (e.g. NPR)",
      });
    }

    // Normalize line items
    const lineItems = rawItems.map((item) => ({
      productID: item.id ? String(item.id) : undefined,
      productTitle: item.name || item.productTitle || "Product",
      productPrice: Number((item.price ?? item.productPrice ?? 0).toFixed(2)),
      productQuantity: item.quantity || item.productQuantity || 1,
    }));

    const result = await sendStartedCheckoutEvent({
      email,
      cartID,
      value,
      currency,
      abandonedCheckoutURL: checkoutURL,
      lineItems,
    });

    if (!result.success) {
      console.error("[started-checkout] Omnisend API error:", result.error);
      // Return 200 to the client — never block UX for analytics failures
      return res.status(200).json({
        success: false,
        warning: "Omnisend event failed — order flow was not affected",
        error: result.error,
      });
    }

    return res.status(200).json({ success: true, status: result.status });
  } catch (err: any) {
    console.error("[started-checkout] Unhandled error:", err);
    return res.status(200).json({
      success: false,
      warning: "Internal error — order flow was not affected",
      error: err?.message,
    });
  }
}
