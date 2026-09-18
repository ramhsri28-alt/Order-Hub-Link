/**
 * Server-side Omnisend service.
 * Handles contact synchronization and custom event dispatching
 * using the secure server-side OMNISEND_API_KEY.
 */

export interface FirstLoginContactData {
  userId: string;
  email: string;
  fullName?: string;
  phone?: string;
  couponCode?: string;
}

export async function sendOmnisendFirstLoginEvent(
  data: FirstLoginContactData
): Promise<{ success: boolean; error?: any }> {
  const apiKey = process.env.OMNISEND_API_KEY;
  if (!apiKey) {
    console.warn("[Omnisend Server] OMNISEND_API_KEY is missing from environment.");
    return { success: false, error: "Missing OMNISEND_API_KEY" };
  }

  const cleanEmail = data.email?.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: "Email is required for first-login event" };
  }

  const cleanPhone = data.phone?.trim() || undefined;
  const fullName = data.fullName?.trim() || "";
  const firstName = fullName ? fullName.split(" ")[0] : "";
  const lastName = fullName ? fullName.split(" ").slice(1).join(" ") : "";
  const couponCode = data.couponCode || "WELCOME20";

  // Step 1: Ensure contact exists / updated in Omnisend Audience with full profile details
  try {
    const identifiers: Array<Record<string, any>> = [
      {
        type: "email",
        id: cleanEmail,
        channels: {
          email: {
            status: "subscribed",
          },
        },
      },
    ];

    if (cleanPhone) {
      identifiers.push({
        type: "phone",
        id: cleanPhone,
        channels: {
          sms: {
            status: "subscribed",
          },
        },
      });
    }

    const contactPayload: Record<string, any> = {
      identifiers,
      // NOTE: sendWelcomeEmail is FALSE here because we use the custom event new_customer_first_login
      // to trigger the specific Hungry Hub welcome automation workflow.
      sendWelcomeEmail: false,
    };

    if (firstName) contactPayload.firstName = firstName;
    if (lastName) contactPayload.lastName = lastName;

    const contactRes = await fetch("https://api.omnisend.com/v3/contacts", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactPayload),
    });

    if (!contactRes.ok) {
      const errText = await contactRes.text();
      console.warn("[Omnisend Server] Contact upsert warning:", contactRes.status, errText);
    } else {
      console.log("[Omnisend Server] Contact profile synced for:", cleanEmail);
    }
  } catch (contactErr) {
    console.warn("[Omnisend Server] Contact upsert network error (proceeding to event):", contactErr);
  }

  // Step 2: Dispatch custom event "new_customer_first_login"
  try {
    const eventPayload: Record<string, any> = {
      systemName: "new_customer_first_login",
      eventName: "new_customer_first_login",
      origin: "api",
      email: cleanEmail,
      fields: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        supabaseUserId: data.userId,
        couponCode: couponCode,
        firstLoginAt: new Date().toISOString(),
      },
    };

    if (cleanPhone) {
      eventPayload.phone = cleanPhone;
    }

    const eventRes = await fetch("https://api.omnisend.com/v3/events", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload),
    });

    if (!eventRes.ok) {
      const errorData = await eventRes.text();
      console.error("[Omnisend Server] Custom event error response:", eventRes.status, errorData);
      return { success: false, error: `Omnisend returned status ${eventRes.status}: ${errorData}` };
    }

    console.log("[Omnisend Server] Successfully emitted new_customer_first_login event for:", cleanEmail);
    return { success: true };
  } catch (eventErr: any) {
    console.error("[Omnisend Server] Event dispatch exception:", eventErr);
    return { success: false, error: eventErr?.message || "Event dispatch network failure" };
  }
}
