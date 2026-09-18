import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

interface CartProductItem {
  id: number;
  name: string;
  price: number; // in paisa
  discount?: number;
  imageUrl?: string;
  image_url?: string;
  quantity: number;
  category?: string;
  description?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ message: "Supabase environment variables missing" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const omnisendApiKey = process.env.OMNISEND_API_KEY;

    // Optional test parameters: forceCartId allows manually testing a specific cart immediately
    const forceCartId = req.query?.forceCartId as string | undefined;
    const isDryRun = req.query?.dryRun === "true";

    // Build site base URL for recovery links
    const forwardedProto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    let baseUrl = process.env.SITE_URL || "";
    if (!baseUrl && host) {
      baseUrl = `${forwardedProto}://${host}`;
    }
    if (!baseUrl) {
      baseUrl = "https://order-hub-link.vercel.app";
    }
    baseUrl = baseUrl.replace(/\/$/, "");

    // Query abandoned carts eligible for email
    // Conditions:
    // 1. Authenticated customer (user_id IS NOT NULL)
    // 2. Email exists (customer_email IS NOT NULL and not blank)
    // 3. Status is 'active' (not already purchased or recovered)
    // 4. Inactivity: updated_at <= NOW() - 1 hour (unless forceCartId is specified for testing)
    // 5. Not already triggered (omnisend_triggered_at IS NULL)
    // 6. Token is not expired (recovery_token_expires_at > NOW())
    let query = supabase
      .from("abandoned_carts")
      .select("*")
      .not("user_id", "is", null)
      .not("customer_email", "is", null)
      .neq("customer_email", "")
      .is("omnisend_triggered_at", null)
      .gt("recovery_token_expires_at", new Date().toISOString())
      .limit(50);

    if (forceCartId) {
      query = supabase
        .from("abandoned_carts")
        .select("*")
        .eq("id", forceCartId)
        .limit(1);
    } else {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      query = query
        .eq("status", "active")
        .lte("updated_at", oneHourAgo);
    }

    const { data: eligibleCarts, error: dbError } = await query;

    if (dbError) {
      console.error("[Abandoned Cart Cron] DB query error:", dbError);
      return res.status(500).json({ message: "Database query error", error: dbError.message });
    }

    if (!eligibleCarts || eligibleCarts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No abandoned carts eligible at this time.",
        processedCount: 0,
      });
    }

    const results = [];

    for (const cart of eligibleCarts) {
      const rawItems = (cart.cart_items || []) as CartProductItem[];
      if (rawItems.length === 0) {
        continue;
      }

      const email = (cart.customer_email || "").trim().toLowerCase();
      if (!email) continue;

      const customerName = (cart.customer_name || "").trim() || "Valued Customer";
      const firstName = customerName.split(" ")[0] || "";
      const lastName = customerName.split(" ").slice(1).join(" ") || "";

      // Ensure a secure recovery token exists
      let recoveryToken = cart.recovery_token;
      if (!recoveryToken) {
        const arr = new Uint8Array(24);
        crypto.getRandomValues(arr);
        recoveryToken = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
        await supabase
          .from("abandoned_carts")
          .update({
            recovery_token: recoveryToken,
            recovery_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", cart.id);
      }

      const recoveryUrl = `${baseUrl}/recover-cart?token=${encodeURIComponent(recoveryToken)}`;

      // PRICE CONVERSION RULE:
      // Prices in database are stored in paisa (cents-style).
      // Example: 50000 = Rs. 500, 12000 = Rs. 120, 8000 = Rs. 80.
      // Must convert all item prices and total to rupees (divide by 100).
      const rawTotalPaisa = Number(cart.total_price) || 0;
      const totalRupees = Number((rawTotalPaisa / 100).toFixed(2));

      const convertedProducts = rawItems.map((item) => {
        const discount = item.discount ?? 0;
        const effectivePaisa = discount > 0 ? item.price * (1 - discount / 100) : item.price;
        const convertedPrice = Number((effectivePaisa / 100).toFixed(2));
        const itemImage = item.imageUrl || item.image_url || "";

        return {
          cartProductID: String(item.id),
          productID: String(item.id),
          title: item.name,
          price: convertedPrice,
          quantity: item.quantity || 1,
          imageUrl: itemImage,
          description: item.description || "",
          category: item.category || "",
        };
      });

      if (isDryRun) {
        results.push({
          cartId: cart.id,
          email,
          totalRupees,
          recoveryUrl,
          productCount: convertedProducts.length,
          dryRun: true,
        });
        continue;
      }

      // Step 1: Sync Contact Audience with Omnisend
      if (omnisendApiKey) {
        try {
          await fetch("https://api.omnisend.com/v3/contacts", {
            method: "POST",
            headers: {
              "X-API-KEY": omnisendApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              identifiers: [
                {
                  type: "email",
                  id: email,
                  channels: { email: { status: "subscribed" } },
                },
              ],
              firstName: firstName || undefined,
              lastName: lastName || undefined,
              sendWelcomeEmail: false,
            }),
          });
        } catch (contactErr) {
          console.warn("[Abandoned Cart Cron] Contact upsert warning:", contactErr);
        }

        // Step 2: Post to Omnisend Standard Carts API
        // This natively initiates Omnisend's Abandoned Cart automation workflow
        try {
          const omnisendCartPayload = {
            cartID: cart.id,
            email: email,
            currency: "NPR",
            cartSum: totalRupees,
            recoveryUrl: recoveryUrl,
            products: convertedProducts,
          };

          const cartApiRes = await fetch("https://api.omnisend.com/v3/carts", {
            method: "POST",
            headers: {
              "X-API-KEY": omnisendApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(omnisendCartPayload),
          });

          if (!cartApiRes.ok) {
            const errText = await cartApiRes.text();
            console.warn("[Abandoned Cart Cron] Omnisend Carts API status:", cartApiRes.status, errText);
          }
        } catch (omniCartErr) {
          console.warn("[Abandoned Cart Cron] Omnisend Carts API error:", omniCartErr);
        }

        // Step 3: Dispatch Omnisend Custom Event "abandoned_cart"
        // Also supports custom automation triggers with full product details
        try {
          const eventPayload = {
            systemName: "abandoned_cart",
            eventName: "abandoned_cart",
            origin: "api",
            email: email,
            fields: {
              customerName: customerName,
              firstName: firstName,
              cartId: cart.id,
              recoveryUrl: recoveryUrl,
              totalAmount: totalRupees,
              currency: "NPR",
              itemCount: convertedProducts.length,
              // Full list of products formatted for email templates
              productsSummary: convertedProducts
                .map((p) => `${p.title} (Qty: ${p.quantity}) - Rs. ${p.price}`)
                .join(", "),
              items: convertedProducts,
              abandonedAt: new Date().toISOString(),
            },
          };

          const eventRes = await fetch("https://api.omnisend.com/v3/events", {
            method: "POST",
            headers: {
              "X-API-KEY": omnisendApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(eventPayload),
          });

          if (!eventRes.ok) {
            const eventErrText = await eventRes.text();
            console.warn("[Abandoned Cart Cron] Custom event response status:", eventRes.status, eventErrText);
          }
        } catch (omniEventErr) {
          console.warn("[Abandoned Cart Cron] Omnisend event dispatch error:", omniEventErr);
        }
      } else {
        console.warn("[Abandoned Cart Cron] OMNISEND_API_KEY missing, skipping external API call");
      }

      // Step 4: Update cart record to mark triggered and prevent duplicate emails
      const nowIso = new Date().toISOString();
      await supabase
        .from("abandoned_carts")
        .update({
          status: "abandoned",
          omnisend_triggered_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", cart.id);

      results.push({
        cartId: cart.id,
        email,
        totalRupees,
        recoveryUrl,
        productsCount: convertedProducts.length,
        status: "triggered",
      });
    }

    return res.status(200).json({
      success: true,
      processedCount: results.length,
      results,
    });
  } catch (err: any) {
    console.error("[Abandoned Cart Cron] Unhandled error:", err);
    return res.status(500).json({ message: "Internal server error", error: err?.message });
  }
}
