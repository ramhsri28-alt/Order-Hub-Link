/**
 * Shared server-side Omnisend ecommerce Events API service.
 *
 * Uses the new Events API endpoint:
 *   POST https://api.omnisend.com/api/events
 *
 * With the new 2026-03-15 authorization header format:
 *   Authorization: Omnisend-API-Key ${OMNISEND_API_KEY}
 *   Omnisend-Version: 2026-03-15
 *
 * These server-side calls are what register ecommerce events in the
 * Omnisend Automation editor (unlike the client-side JS snippet).
 */

const OMNISEND_EVENTS_URL = "https://api.omnisend.com/api/events";
const OMNISEND_API_VERSION = "2026-03-15";

// ─── PAYLOAD TYPES ─────────────────────────────────────────────────────────────

export interface OmnisendLineItem {
  productID?: string;
  productTitle: string;
  productPrice: number;
  productQuantity: number;
}

export interface StartedCheckoutPayload {
  email: string;
  cartID: string;
  value: number;
  currency: string;
  abandonedCheckoutURL: string;
  lineItems: OmnisendLineItem[];
}

export interface PlacedOrderPayload {
  email: string;
  orderID: string;
  totalPrice: number;
  currency: string;
  lineItems: OmnisendLineItem[];
}

export interface AddedToCartPayload {
  email: string;
  value: number;
  currency: string;
  lineItems: OmnisendLineItem[];
}

// ─── INTERNAL HELPER ───────────────────────────────────────────────────────────

/**
 * Validates that required fields are present and non-empty.
 * Returns an error string if invalid, or null if valid.
 */
function validateContact(email: string, currency: string): string | null {
  if (!email || typeof email !== "string" || !email.trim()) {
    return "contact.email is required and must be a non-empty string";
  }
  if (!currency || typeof currency !== "string" || currency.trim().length !== 3) {
    return "currency must be a valid 3-letter ISO currency code (e.g. NPR, USD)";
  }
  return null;
}

/**
 * Core fetch wrapper that calls the Omnisend Events API.
 * Returns a structured result with success/error info.
 */
async function callOmnisendEventsAPI(
  eventName: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; status?: number; error?: string }> {
  const apiKey = process.env.OMNISEND_API_KEY;
  if (!apiKey) {
    const err = "[Omnisend Events] OMNISEND_API_KEY is not configured in environment.";
    console.error(err);
    return { success: false, error: err };
  }

  try {
    const res = await fetch(OMNISEND_EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Omnisend-API-Key ${apiKey}`,
        "Omnisend-Version": OMNISEND_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log(`[Omnisend Events] ✅ "${eventName}" event sent successfully (HTTP ${res.status})`);
      return { success: true, status: res.status };
    }

    const errText = await res.text();
    console.error(
      `[Omnisend Events] ❌ "${eventName}" event failed — HTTP ${res.status}:`,
      errText
    );
    return { success: false, status: res.status, error: errText };
  } catch (err: any) {
    const msg = err?.message || "Network error calling Omnisend Events API";
    console.error(`[Omnisend Events] ❌ "${eventName}" event network error:`, msg);
    return { success: false, error: msg };
  }
}

// ─── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Sends a "started checkout" ecommerce event to Omnisend.
 *
 * Fires when a user opens the checkout dialog or lands on a cart
 * recovery URL. This is what populates the "started checkout" trigger
 * in the Omnisend Automation workflow editor.
 */
export async function sendStartedCheckoutEvent(
  payload: StartedCheckoutPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  const validationError = validateContact(payload.email, payload.currency);
  if (validationError) {
    console.warn("[Omnisend Events] started checkout validation failed:", validationError);
    return { success: false, error: validationError };
  }

  const body = {
    eventName: "started checkout",
    origin: "api",
    contact: {
      email: payload.email.trim().toLowerCase(),
    },
    properties: {
      cartID: payload.cartID,
      value: Number(payload.value.toFixed(2)),
      currency: payload.currency.trim().toUpperCase(),
      abandonedCheckoutURL: payload.abandonedCheckoutURL,
      lineItems: payload.lineItems.map((item) => ({
        productID: item.productID || undefined,
        productTitle: item.productTitle,
        productPrice: Number(item.productPrice.toFixed(2)),
        productQuantity: item.productQuantity,
      })),
    },
  };

  return callOmnisendEventsAPI("started checkout", body);
}

/**
 * Sends a "placed order" ecommerce event to Omnisend.
 *
 * Must be called server-side after a successful order creation.
 * This is what populates the "placed order" trigger in the Omnisend
 * Automation workflow editor and registers revenue attribution.
 */
export async function sendPlacedOrderEvent(
  payload: PlacedOrderPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  const validationError = validateContact(payload.email, payload.currency);
  if (validationError) {
    console.warn("[Omnisend Events] placed order validation failed:", validationError);
    return { success: false, error: validationError };
  }

  const body = {
    eventName: "placed order",
    origin: "api",
    contact: {
      email: payload.email.trim().toLowerCase(),
    },
    properties: {
      orderID: String(payload.orderID),
      totalPrice: Number(payload.totalPrice.toFixed(2)),
      currency: payload.currency.trim().toUpperCase(),
      lineItems: payload.lineItems.map((item) => ({
        productID: item.productID || undefined,
        productTitle: item.productTitle,
        productPrice: Number(item.productPrice.toFixed(2)),
        productQuantity: item.productQuantity,
      })),
    },
  };

  return callOmnisendEventsAPI("placed order", body);
}

/**
 * Sends an "added product to cart" ecommerce event to Omnisend.
 *
 * Can be used for server-side test pings; real-time add-to-cart events
 * are tracked via the browser JS snippet (window.omnisend.push).
 */
export async function sendAddedToCartEvent(
  payload: AddedToCartPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  const validationError = validateContact(payload.email, payload.currency);
  if (validationError) {
    console.warn("[Omnisend Events] added product to cart validation failed:", validationError);
    return { success: false, error: validationError };
  }

  const body = {
    eventName: "added product to cart",
    origin: "api",
    contact: {
      email: payload.email.trim().toLowerCase(),
    },
    properties: {
      value: Number(payload.value.toFixed(2)),
      currency: payload.currency.trim().toUpperCase(),
      lineItems: payload.lineItems.map((item) => ({
        productID: item.productID || undefined,
        productTitle: item.productTitle,
        productPrice: Number(item.productPrice.toFixed(2)),
        productQuantity: item.productQuantity,
      })),
    },
  };

  return callOmnisendEventsAPI("added product to cart", body);
}
