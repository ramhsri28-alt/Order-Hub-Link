// Type declaration for Omnisend global queue
declare global {
  interface Window {
    omnisend?: any[];
  }
}

/**
 * Waits until the Omnisend script has fully initialized (not just the queue array).
 * The queue array is injected synchronously on page load, but the actual Omnisend
 * processor that reads the queue loads asynchronously from omnisnippet1.com.
 * We poll until the internal 'identify' method exists, meaning it's ready to process events.
 *
 * Max wait: 12 seconds. If Omnisend never loads (e.g. ad blocker), we resolve anyway
 * so we never break the auth/UI flow.
 */
function waitForOmnisend(timeoutMs = 12000): Promise<void> {
  return new Promise((resolve) => {
    const interval = 200;
    let elapsed = 0;

    const check = () => {
      // Omnisend is fully ready when it has processed the queue and attached its internal API.
      // The queue will have been replaced by the real push function (not a plain array).
      const ready =
        typeof window !== "undefined" &&
        window.omnisend &&
        !Array.isArray(window.omnisend); // After init, omnisend is no longer a plain array

      if (ready) {
        resolve();
        return;
      }

      // Fallback: if still an array but we've been waiting a long time, just proceed.
      // Events pushed into the array queue will still be processed once Omnisend loads.
      elapsed += interval;
      if (elapsed >= timeoutMs) {
        resolve();
        return;
      }

      setTimeout(check, interval);
    };

    // Start checking immediately
    if (typeof window !== "undefined") {
      check();
    } else {
      resolve();
    }
  });
}

/**
 * Safely pushes a command to Omnisend, waiting for it to be ready first.
 * Accepts the same arguments as window.omnisend.push().
 */
async function omnisendPush(...args: any[][]) {
  await waitForOmnisend();
  if (typeof window !== "undefined" && window.omnisend) {
    for (const arg of args) {
      try {
        window.omnisend.push(arg);
      } catch (err) {
        console.warn("[Omnisend] Push error:", err);
      }
    }
  }
}

// ─── NORMALIZER ────────────────────────────────────────────────────────────────

/**
 * Normalizes price from internal representation (stored in paisa/cents)
 * to standard currency units.
 */
function normalizePrice(price: number): number {
  return Number((price / 100).toFixed(2));
}

// ─── CONTACT IDENTIFICATION ─────────────────────────────────────────────────────

/**
 * Tracks a NEW user sign-up and creates/updates them as a subscribed contact in Omnisend.
 * Sends: email, phone, firstName, status="subscribed"
 * This is what makes them appear in your Omnisend Audience contact list.
 */
export async function trackOmnisendSignUp(
  userEmail: string,
  options: { phone?: string; fullName?: string } = {}
) {
  try {
    const firstName = options.fullName?.split(" ")[0] ?? "";
    const lastName = options.fullName?.split(" ").slice(1).join(" ") ?? "";

    const accountPayload: Record<string, any> = {
      email: userEmail,
      status: "subscribed", // Marks as subscribed → triggers Welcome automation
    };

    if (firstName) accountPayload.firstName = firstName;
    if (lastName) accountPayload.lastName = lastName;
    if (options.phone) accountPayload.phone = options.phone;

    await omnisendPush(
      ["account", accountPayload],
      ["track", "$pageViewed"] // Required by Omnisend to attach session context
    );

    console.log("[Omnisend] Sign-up tracked for:", userEmail);
  } catch (err) {
    console.warn("[Omnisend] Sign-up tracking error:", err);
  }
}

/**
 * Tracks a returning user sign-in. Identifies the session without changing subscription status.
 * This lets Omnisend know who is browsing right now (for abandoned cart, browse abandonment, etc.)
 */
export async function trackOmnisendSignIn(
  userEmail: string,
  options: { phone?: string; fullName?: string } = {}
) {
  try {
    const firstName = options.fullName?.split(" ")[0] ?? "";

    const accountPayload: Record<string, any> = {
      email: userEmail,
    };

    if (firstName) accountPayload.firstName = firstName;
    if (options.phone) accountPayload.phone = options.phone;

    await omnisendPush(
      ["account", accountPayload],
      ["track", "$pageViewed"]
    );

    console.log("[Omnisend] Sign-in tracked for:", userEmail);
  } catch (err) {
    console.warn("[Omnisend] Sign-in tracking error:", err);
  }
}

// ─── CART EVENTS ───────────────────────────────────────────────────────────────

export interface OmnisendLineItem {
  productTitle: string;
  price: number;
  quantity: number;
}

/**
 * Tracks an 'added product to cart' event in Omnisend.
 * This is what powers the Abandoned Cart automation.
 * If a user adds an item and doesn't place an order, Omnisend can detect this
 * and trigger the Abandoned Cart email automatically.
 */
export async function trackOmnisendAddToCart(
  item: {
    name: string;
    price: number;
    discount?: number;
  },
  quantity: number = 1
) {
  try {
    const discount = item.discount ?? 0;
    const effectivePaisa =
      discount > 0 ? item.price * (1 - discount / 100) : item.price;
    const productPrice = normalizePrice(effectivePaisa);
    const productQuantity = quantity || 1;

    await omnisendPush([
      "track",
      "added product to cart",
      {
        currency: "NPR",
        value: productPrice,
        lineItems: [
          {
            productTitle: item.name,
            price: productPrice,
            quantity: productQuantity,
          },
        ],
      },
    ]);

    console.log("[Omnisend] Add-to-cart tracked:", item.name);
  } catch (err) {
    console.warn("[Omnisend] Add-to-cart tracking error:", err);
  }
}

/**
 * Tracks a 'placed order' event in Omnisend upon successful checkout.
 * Calling this clears the "abandoned cart" state for this user in Omnisend.
 */
export async function trackOmnisendPlacedOrder(orderData: {
  totalAmount: number; // in paisa/cents
  email?: string;
  lineItems: OmnisendLineItem[];
}) {
  try {
    const totalOrderAmount = normalizePrice(orderData.totalAmount);

    await omnisendPush([
      "track",
      "placed order",
      {
        currency: "NPR",
        value: totalOrderAmount,
        email: orderData.email || undefined,
        lineItems: orderData.lineItems,
      },
    ]);

    console.log("[Omnisend] Order placed tracked. Amount:", totalOrderAmount);
  } catch (err) {
    console.warn("[Omnisend] Order tracking error:", err);
  }
}
