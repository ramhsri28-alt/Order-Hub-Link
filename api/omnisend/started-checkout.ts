import type { VercelRequest, VercelResponse } from "@vercel/node";

// Inline Omnisend call — no cross-directory import so Vercel can bundle correctly
async function fireOmnisendStartedCheckout(payload: {
  email: string;
  cartID: string;
  value: number;
  currency: string;
  abandonedCheckoutURL: string;
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
        eventName: "started checkout",
        origin: "api",
        contact: { email: payload.email },
        properties: {
          cartID: payload.cartID,
          value: payload.value,
          currency: payload.currency,
          abandonedCheckoutURL: payload.abandonedCheckoutURL,
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

    const result = await fireOmnisendStartedCheckout({
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
