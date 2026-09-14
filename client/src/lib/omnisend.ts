// Type declaration for Omnisend global queue
declare global {
  interface Window {
    omnisend?: any[];
  }
}

/**
 * Normalizes price from internal representation (stored in paisa/cents)
 * to standard currency units.
 */
function normalizePrice(price: number): number {
  return Number((price / 100).toFixed(2));
}

/**
 * Tracks a new user sign-up / newsletter subscribe in Omnisend.
 * Subscribes the user so they can receive Welcome automations.
 */
export function trackOmnisendSignUp(userEmail: string) {
  try {
    if (typeof window !== "undefined" && window.omnisend && userEmail) {
      window.omnisend.push([
        "account",
        {
          email: userEmail,
          status: "subscribed",
        },
      ]);
      window.omnisend.push(["track", "$pageViewed"]);
    }
  } catch (err) {
    // Fail silently to never interrupt auth or UI flow
    console.warn("Omnisend sign-up tracking error:", err);
  }
}

/**
 * Tracks a returning user sign-in / login in Omnisend.
 * Identifies the returning session.
 */
export function trackOmnisendSignIn(userEmail: string) {
  try {
    if (typeof window !== "undefined" && window.omnisend && userEmail) {
      window.omnisend.push([
        "account",
        {
          email: userEmail,
        },
      ]);
    }
  } catch (err) {
    // Fail silently to never interrupt auth or UI flow
    console.warn("Omnisend sign-in tracking error:", err);
  }
}

export interface OmnisendLineItem {
  productTitle: string;
  price: number;
  quantity: number;
}

/**
 * Tracks an 'added product to cart' event in Omnisend.
 */
export function trackOmnisendAddToCart(
  item: {
    name: string;
    price: number;
    discount?: number;
  },
  quantity: number = 1
) {
  try {
    if (typeof window !== "undefined" && window.omnisend) {
      const discount = item.discount ?? 0;
      const effectivePaisa = discount > 0 ? item.price * (1 - discount / 100) : item.price;
      const productPrice = normalizePrice(effectivePaisa);
      const productQuantity = quantity || 1;

      window.omnisend.push([
        "track",
        "added product to cart",
        {
          currency: "USD",
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
    }
  } catch (err) {
    // Fail silently to never interrupt cart operations
    console.warn("Omnisend add-to-cart tracking error:", err);
  }
}

/**
 * Tracks a 'placed order' event in Omnisend upon successful checkout.
 */
export function trackOmnisendPlacedOrder(orderData: {
  totalAmount: number; // in paisa/cents
  email?: string;
  lineItems: OmnisendLineItem[];
}) {
  try {
    if (typeof window !== "undefined" && window.omnisend) {
      const totalOrderAmount = normalizePrice(orderData.totalAmount);

      window.omnisend.push([
        "track",
        "placed order",
        {
          currency: "USD",
          value: totalOrderAmount,
          email: orderData.email || undefined,
          lineItems: orderData.lineItems,
        },
      ]);
    }
  } catch (err) {
    // Fail silently to never interrupt checkout or order completion
    console.warn("Omnisend order tracking error:", err);
  }
}
