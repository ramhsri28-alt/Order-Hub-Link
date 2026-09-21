import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { sendStartedCheckoutEvent } from "./lib/omnisend-events";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const token = (req.query?.token as string || "").trim();

  if (!token) {
    return res.status(400).json({ valid: false, reason: "invalid_token", message: "Token is required" });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ valid: false, message: "Server configuration missing" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc("get_cart_by_recovery_token", {
      p_token: token,
    });

    if (error) {
      return res.status(500).json({ valid: false, error: error.message });
    }

    // ── Fire "started checkout" Omnisend event (fire-and-forget) ──────────────
    // When a customer clicks a recovery link and lands on this endpoint, it means
    // they have re-engaged — this is the canonical "started checkout" trigger point
    // for the abandoned cart recovery loop.
    if (data?.valid && data?.customer_email) {
      const customerEmail = (data.customer_email as string).trim().toLowerCase();
      if (customerEmail) {
        const forwardedProto = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host || "hubhungry.vercel.app";
        const siteBase = process.env.SITE_URL || `${forwardedProto}://${host}`;
        const recoveryUrl = `${siteBase}/recover-cart?token=${encodeURIComponent(token)}`;

        // Convert cart items from raw Supabase format to Omnisend line items
        const rawItems: Array<{
          id?: number;
          name?: string;
          price?: number;
          quantity?: number;
          discount?: number;
        }> = Array.isArray(data.cart_items) ? data.cart_items : [];

        const lineItems = rawItems.map((item) => {
          const discount = item.discount ?? 0;
          const effectivePaisa =
            discount > 0
              ? (item.price ?? 0) * (1 - discount / 100)
              : (item.price ?? 0);
          return {
            productID: item.id ? String(item.id) : undefined,
            productTitle: item.name || "Menu Item",
            // Prices stored in paisa → convert to rupees for Omnisend
            productPrice: Number((effectivePaisa / 100).toFixed(2)),
            productQuantity: item.quantity || 1,
          };
        });

        const totalPaisa = Number(data.total_price ?? 0);
        const totalRupees = Number((totalPaisa / 100).toFixed(2));

        sendStartedCheckoutEvent({
          email: customerEmail,
          cartID: data.cart_id || data.id || token,
          value: totalRupees,
          currency: "NPR",
          abandonedCheckoutURL: recoveryUrl,
          lineItems,
        }).catch((err) => {
          console.warn(
            "[recover-cart] Omnisend started-checkout fire-and-forget error:",
            err?.message
          );
        });
      }
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ valid: false, message: err?.message || "Internal server error" });
  }
}
