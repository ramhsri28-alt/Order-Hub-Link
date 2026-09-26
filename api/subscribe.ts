import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, phone, firstName, lastName, fullName } = req.body || {};

    if (!email && !phone) {
      return res.status(400).json({ message: "Email or phone is required" });
    }

    const apiKey = process.env.OMNISEND_API_KEY;
    if (!apiKey) {
      console.warn("[Omnisend Server] OMNISEND_API_KEY is missing from environment variables.");
      return res.status(500).json({ message: "Server configuration error: missing OMNISEND_API_KEY" });
    }

    const fName = firstName || (fullName ? fullName.split(" ")[0] : "");
    const lName = lastName || (fullName ? fullName.split(" ").slice(1).join(" ") : "");

    const identifiers: Array<Record<string, any>> = [];
    if (email) {
      identifiers.push({
        type: "email",
        id: email.trim(),
        channels: {
          email: {
            status: "subscribed",
          },
        },
      });
    }

    if (phone) {
      identifiers.push({
        type: "phone",
        id: phone.trim(),
        channels: {
          sms: {
            status: "subscribed",
          },
        },
      });
    }

    const payload: Record<string, any> = {
      identifiers,
      sendWelcomeEmail: false,
    };

    if (fName) payload.firstName = fName;
    if (lName) payload.lastName = lName;

    const response = await fetch("https://api.omnisend.com/v3/contacts", {
      method: "POST",
      headers: {
        Authorization: `Omnisend-API-Key ${apiKey}`,
        "Omnisend-Version": "2026-03-15",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn("[Omnisend Server] Contact sync response warning:", response.status, data);
      return res.status(response.status).json({ success: false, error: data });
    }

    console.log("[Omnisend Server] Contact synced successfully:", email || phone);
    return res.status(200).json({ success: true, contact: data });
  } catch (err: any) {
    console.error("[Omnisend Server] Contact sync error:", err);
    return res.status(500).json({ message: "Failed to sync contact with Omnisend", error: err?.message });
  }
}
