import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  sendStartedCheckoutEvent,
  sendPlacedOrderEvent,
  sendAddedToCartEvent,
} from "../lib/omnisend-events";

/**
 * POST /api/omnisend/test-events
 *
 * Sends test pings for all three ecommerce events to the Omnisend Events API:
 *   - "started checkout"
 *   - "placed order"
 *   - "added product to cart"
 *
 * Purpose: Verify that Omnisend returns 200/204 and that the triggers
 * appear in the Omnisend Automation workflow editor dropdown.
 *
 * Security: Protected by CRON_SECRET (or OMNISEND_TEST_SECRET) env var
 * so it cannot be triggered from the public internet.
 *
 * Usage:
 *   POST /api/omnisend/test-events
 *   Headers: { "x-cron-secret": "<your CRON_SECRET value>" }
 *
 *   OR with a custom test email:
 *   Body: { "email": "your@email.com", "secret": "<CRON_SECRET>" }
 */

const TEST_CART_ID = "test-cart-001";
const TEST_ORDER_ID = "test-order-001";
const DEFAULT_TEST_EMAIL = "test@example.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-cron-secret"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ── Authentication ─────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET || process.env.OMNISEND_TEST_SECRET || "";
  const providedSecret =
    (req.headers["x-cron-secret"] as string) ||
    (req.body?.secret as string) ||
    (req.query?.secret as string) ||
    "";

  if (cronSecret && providedSecret !== cronSecret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: invalid or missing x-cron-secret header",
    });
  }

  if (!cronSecret) {
    console.warn(
      "[test-events] No CRON_SECRET configured — test endpoint is unprotected. Set CRON_SECRET in Vercel env vars."
    );
  }

  // ── Resolve test email ─────────────────────────────────────────────────────
  const testEmail =
    ((req.body?.email || req.query?.email) as string | undefined)?.trim().toLowerCase() ||
    DEFAULT_TEST_EMAIL;

  const siteBase =
    process.env.SITE_URL ||
    `https://${req.headers["x-forwarded-host"] || req.headers.host || "hubhungry.vercel.app"}`;

  const testCheckoutURL = `${siteBase}/recover-cart?token=test-token-000`;

  const testLineItems = [
    {
      productID: "menu-1",
      productTitle: "Momo (Steamed)",
      productPrice: 250.0,
      productQuantity: 2,
    },
    {
      productID: "menu-2",
      productTitle: "Masala Tea",
      productPrice: 50.0,
      productQuantity: 1,
    },
  ];

  const results: Record<string, unknown> = {};

  // ── Test 1: started checkout ───────────────────────────────────────────────
  console.log("[test-events] Sending test 'started checkout' event to:", testEmail);
  const checkoutResult = await sendStartedCheckoutEvent({
    email: testEmail,
    cartID: TEST_CART_ID,
    value: 550.0,
    currency: "NPR",
    abandonedCheckoutURL: testCheckoutURL,
    lineItems: testLineItems,
  });
  results["started checkout"] = {
    success: checkoutResult.success,
    status: checkoutResult.status,
    error: checkoutResult.error || undefined,
  };

  // ── Test 2: placed order ───────────────────────────────────────────────────
  console.log("[test-events] Sending test 'placed order' event to:", testEmail);
  const orderResult = await sendPlacedOrderEvent({
    email: testEmail,
    orderID: TEST_ORDER_ID,
    totalPrice: 605.0, // 550 + 10% tax
    currency: "NPR",
    lineItems: testLineItems,
  });
  results["placed order"] = {
    success: orderResult.success,
    status: orderResult.status,
    error: orderResult.error || undefined,
  };

  // ── Test 3: added product to cart ─────────────────────────────────────────
  console.log("[test-events] Sending test 'added product to cart' event to:", testEmail);
  const cartResult = await sendAddedToCartEvent({
    email: testEmail,
    value: 250.0,
    currency: "NPR",
    lineItems: [testLineItems[0]],
  });
  results["added product to cart"] = {
    success: cartResult.success,
    status: cartResult.status,
    error: cartResult.error || undefined,
  };

  // ── Summary ────────────────────────────────────────────────────────────────
  const allSucceeded = Object.values(results).every((r: any) => r.success === true);
  const anyFailed = Object.values(results).some((r: any) => r.success === false);

  console.log("[test-events] Results:", JSON.stringify(results, null, 2));

  return res.status(200).json({
    success: allSucceeded,
    partial: !allSucceeded && !anyFailed,
    testEmail,
    results,
    message: allSucceeded
      ? "All three ecommerce events sent successfully. Check the Omnisend Automation editor dropdown."
      : "One or more events failed. Check error fields for details.",
    nextSteps: [
      "1. Open Omnisend dashboard → Automations → New Workflow",
      "2. Expand the Trigger dropdown and verify 'started checkout', 'placed order', and 'added product to cart' appear",
      "3. Check Omnisend → Reports → Events to see the test events recorded for: " + testEmail,
    ],
  });
}
