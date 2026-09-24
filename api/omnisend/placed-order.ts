import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Inline Omnisend call — no cross-directory import so Vercel can bundle correctly
async function fireOmnisendPlacedOrder(payload: {
  email: string;
  orderID: string;
  totalPrice: number;
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
        eventName: "placed order",
        origin: "api",
        contact: { email: payload.email },
        properties: {
          orderID: payload.orderID,
          totalPrice: payload.totalPrice,
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
 * POST /api/omnisend/placed-order
 *
 * Internal server-side endpoint that fires the "placed order" ecommerce
 * event to Omnisend Events API after a successful order creation.
 *
 * Called from server/routes.ts immediately after storage.createOrder() succeeds.
 * NOT intended to be called directly from the client.
 *
 * Idempotency: before firing, checks that `orders.omnisend_placed_order_at IS NULL`
 * for the given order ID to prevent duplicate event fires.
 */

interface PlacedOrderLineItem {
  id?: number | string;
  name?: string;
  productTitle?: string;
  price: number;          // already in currency units (NOT paisa)
  productPrice?: number;
  quantity: number;
  productQuantity?: number;
}

interface PlacedOrderBody {
  email: string;
  orderId?: string | number;
  orderID?: string | number;
  totalPrice?: number;   // in currency units (NOT paisa)
  totalAmount?: number;  // alias for totalPrice
  currency?: string;
  lineItems?: PlacedOrderLineItem[];
  items?: PlacedOrderLineItem[];        // alias for lineItems
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
    const body = (req.body || {}) as PlacedOrderBody;

    // Resolve field aliases
    const email = (body.email || "").trim().toLowerCase();
    const orderID = String(body.orderId ?? body.orderID ?? "");
    const currency = (body.currency || "NPR").trim().toUpperCase();
    const totalPrice = Number(body.totalPrice ?? body.totalAmount ?? 0);
    const rawItems: PlacedOrderLineItem[] = body.lineItems || body.items || [];

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "email is required in the request body",
      });
    }

    if (!orderID) {
      return res.status(400).json({
        success: false,
        message: "orderId is required in the request body",
      });
    }

    if (currency.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "currency must be a valid 3-letter ISO code (e.g. NPR)",
      });
    }

    // ── Idempotency check via Supabase ──────────────────────────────────────
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Atomically claim: only update if omnisend_placed_order_at IS NULL
        const { data: updateData, error: updateError } = await supabase
          .from("orders")
          .update({ omnisend_placed_order_at: new Date().toISOString() })
          .eq("id", Number(orderID))
          .is("omnisend_placed_order_at", null)
          .select("id")
          .single();

        if (updateError || !updateData) {
          // Either the row doesn't exist, or the event was already fired
          console.log(
            `[placed-order] Order ${orderID} — Omnisend event already fired or order not found. Skipping duplicate.`
          );
          return res.status(200).json({
            success: true,
            skipped: true,
            reason: "already_triggered_or_not_found",
          });
        }

        console.log(`[placed-order] Order ${orderID} — omnisend_placed_order_at claimed.`);
      } catch (dbErr: any) {
        // Non-fatal: log but proceed with event dispatch anyway
        console.warn("[placed-order] Idempotency check failed (proceeding):", dbErr?.message);
      }
    } else {
      console.warn("[placed-order] Supabase env vars missing — skipping idempotency check.");
    }

    // ── Normalize line items ────────────────────────────────────────────────
    const lineItems = rawItems.map((item) => ({
      productID: item.id ? String(item.id) : undefined,
      productTitle: item.name || item.productTitle || "Product",
      productPrice: Number((item.price ?? item.productPrice ?? 0).toFixed(2)),
      productQuantity: item.quantity || item.productQuantity || 1,
    }));

    // ── Fire Omnisend event ─────────────────────────────────────────────────
    const result = await fireOmnisendPlacedOrder({
      email,
      orderID,
      totalPrice,
      currency,
      lineItems,
    });

    if (!result.success) {
      console.error("[placed-order] Omnisend API error:", result.error);
      // Return 200 — order was already placed; this is a non-blocking analytics call
      return res.status(200).json({
        success: false,
        warning: "Omnisend event failed — order was placed successfully",
        error: result.error,
      });
    }

    return res.status(200).json({ success: true, status: result.status });
  } catch (err: any) {
    console.error("[placed-order] Unhandled error:", err);
    return res.status(200).json({
      success: false,
      warning: "Internal error — order was placed successfully",
      error: err?.message,
    });
  }
}
