import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ valid: false, message: err?.message || "Internal server error" });
  }
}
