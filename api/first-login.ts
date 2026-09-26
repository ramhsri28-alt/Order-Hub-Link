import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ message: "Supabase environment variables missing" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract Bearer token from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      return res.status(401).json({ message: "Invalid or expired session token" });
    }

    const user = userData.user;
    const body = req.body || {};
    const email = (user.email || body.email || "").trim().toLowerCase();
    const fullName = (body.fullName || user.user_metadata?.full_name || "").trim();
    const phone = (body.phone || user.user_metadata?.phone || "").trim();

    // Atomic claim in Supabase database
    const { data: claimData, error: claimError } = await supabase.rpc(
      "claim_first_login_welcome",
      {
        p_user_id: user.id,
        p_email: email || null,
        p_full_name: fullName || null,
        p_phone: phone || null,
      }
    );

    if (claimError) {
      console.error("[Omnisend Vercel] Claim RPC error:", claimError);
      return res.status(500).json({ message: "Failed to verify first-login status" });
    }

    // If already triggered or not claimed, return without emitting event
    if (!claimData?.claimed) {
      return res.status(200).json({
        success: true,
        triggered: false,
        reason: claimData?.reason || "already_triggered",
      });
    }

    // genuinely new first qualifying login -> Send to Omnisend
    const apiKey = process.env.OMNISEND_API_KEY;
    if (!apiKey) {
      console.warn("[Omnisend Vercel] OMNISEND_API_KEY missing from environment");
      return res.status(200).json({
        success: true,
        triggered: true,
        warning: "Claim recorded in DB, but OMNISEND_API_KEY is not configured.",
      });
    }

    const firstName = fullName ? fullName.split(" ")[0] : "";
    const lastName = fullName ? fullName.split(" ").slice(1).join(" ") : "";

    // Step 1: Upsert Omnisend contact audience
    try {
      const identifiers: Array<Record<string, any>> = [
        {
          type: "email",
          id: email,
          channels: { email: { status: "subscribed" } },
        },
      ];
      if (phone) {
        identifiers.push({
          type: "phone",
          id: phone,
          channels: { sms: { status: "subscribed" } },
        });
      }

      await fetch("https://api.omnisend.com/v3/contacts", {
        method: "POST",
        headers: {
          Authorization: `Omnisend-API-Key ${apiKey}`,
          "Omnisend-Version": "2026-03-15",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifiers,
          sendWelcomeEmail: false,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      });
    } catch (upsertErr) {
      console.warn("[Omnisend Vercel] Contact upsert warning:", upsertErr);
    }

    // Step 2: Send custom event
    const eventPayload: Record<string, any> = {
      systemName: "new_customer_first_login",
      eventName: "new_customer_first_login",
      origin: "api",
      email: email,
      fields: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        supabaseUserId: user.id,
        couponCode: "WELCOME20",
        firstLoginAt: new Date().toISOString(),
      },
    };
    if (phone) {
      eventPayload.phone = phone;
    }

    const eventRes = await fetch("https://api.omnisend.com/v3/events", {
      method: "POST",
      headers: {
        Authorization: `Omnisend-API-Key ${apiKey}`,
        "Omnisend-Version": "2026-03-15",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });

    if (!eventRes.ok) {
      const errText = await eventRes.text();
      console.error("[Omnisend Vercel] Custom event error:", eventRes.status, errText);
      return res.status(200).json({
        success: true,
        triggered: true,
        eventWarning: `Event accepted locally, Omnisend returned ${eventRes.status}`,
      });
    }

    return res.status(200).json({
      success: true,
      triggered: true,
    });
  } catch (err: any) {
    console.error("[Omnisend Vercel] Unhandled error:", err);
    return res.status(500).json({ message: "Internal server error", error: err?.message });
  }
}
