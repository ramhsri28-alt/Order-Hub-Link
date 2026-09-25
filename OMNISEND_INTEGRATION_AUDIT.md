# Omnisend Integration Audit & History Report
*Repository: Order-Hub-Link (Hungry Hub)*  
*Audit Date: September 25, 2026*  

---

## 1. Executive Summary
This document provides a factual, code-verified audit of the complete **Omnisend integration history** for the Hungry Hub e-commerce web application. It documents every distinct implementation milestone, architectural decision, pitfall encountered, and concrete recommendations for current and future maintainers.

No production application code was altered during this audit.

---

## 2. What Was Actually Done (Factual Timeline & Code Audit)

| # | Milestone & Commits | Files Involved | Actual Technical Behavior in Code |
| :--- | :--- | :--- | :--- |
| **1** | **Client Tracking Snippet**<br>`05ed3f8`, `b60cd2b` | `index.html`<br>`client/src/lib/omnisend.ts` | Injects Omnisend's `launcher-v2.js` with Brand ID `6aa64ef6f9e55097b6c7ff48`. Pushes `$pageViewed` and user account identification (`email`, `phone`) to the browser queue `window.omnisend`. *(Note: Commit `9add7a0` deleted an orphaned copy in `client/index.html`, but root `index.html` is the active Vite entry and retains the tracking script).* |
| **2** | **Contact Sync & Global Auth Listener**<br>`4fd0dba`, `9b0c63d`, `d4450d7` | `api/subscribe.ts`<br>`server/omnisend.ts`<br>`client/src/hooks/use-omnisend-auth-sync.ts` | When a user registers or logs in via Supabase, their contact profile (`email`, `fullName`, and E.164-formatted `phone`) is upserted to `POST https://api.omnisend.com/v3/contacts` using the server-side API key. |
| **3** | **First Login Welcome Event**<br>`6531a85` | `api/first-login.ts`<br>Supabase RPC `claim_first_login_welcome` | Verifies and atomically locks first-login status in Supabase (`customer_profiles.omnisend_welcome_triggered_at`). Emits custom event `new_customer_first_login` to `POST /v3/events` with a 20% discount coupon code (`WELCOME20`). |
| **4** | **Abandoned Cart Engine & 15m Cron**<br>`773a8c3`, `31c8776`, `5cbadc0`, `cdc63f3` | `api/cron/check-abandoned-carts.ts`<br>`client/src/hooks/use-cart.ts`<br>`vercel.json` | Real-time cart state syncs to Supabase table `abandoned_carts`. A Vercel Cron runs every 15 minutes (`*/15 * * * *`), detects carts inactive >15 minutes with `omnisend_triggered_at IS NULL`, and dispatches the ecommerce event `added product to cart` to `https://api.omnisend.com/api/events` with `origin: "api"` and a unique recovery link (`/recover-cart?token=...`). |
| **5** | **Store Catalog Sync (Products & Categories)**<br>`e851fbb`, `13acf53`, `92dea6d`, `a753d4d`, `311b5ed` | `api/omnisend/sync-products.ts`<br>`vercel.json` | Automated daily Vercel Cron at 02:00 UTC (`0 2 * * *`). Queries 17 menu items across 4 categories from Supabase. Checks existing categories via `GET /v3/categories` (skipping existing ones to avoid 409 conflicts) and upserts products via `PUT /v3/products/{id}`. |
| **6** | **Vercel Serverless Routing Architecture**<br>`be17d57`, `3fc3c7c`, `c87de90`, `3512b26`, `0930bcd` | `api/omnisend-*.ts`<br>`vercel.json` | Created flat top-level bridge entry points in `api/` and mapped explicit rewrites in `vercel.json` to resolve nested subdirectory routing issues and ensure Vercel compiles all endpoints as independent serverless functions. |
| **7** | **Placed Order & Store Revenue Attribution**<br>`0b90f3c` | `api/omnisend/placed-order.ts`<br>`client/src/components/checkout-dialog.tsx` | Upon checkout completion, fires to `/api/omnisend/placed-order` fire-and-forget. Claims the atomic database lock `orders.omnisend_placed_order_at`, dispatches to Omnisend's official `POST /v3/orders` (for Store Sales and email revenue attribution) and fires the `placed order` event. |
| **8** | **GitHub Actions Workflows** | `.github/workflows/main.yml` | Builds and deploys the static Vite frontend to GitHub Pages. **No GitHub Actions touch or trigger Omnisend.** |

---

## 3. What Went Wrong (Mistakes & Root Causes)

### 1. Category HTTP 409 Conflict Errors in API Logs
* **Symptom:** Omnisend's API log showed multiple `POST /v3/categories` returning `409 Conflict`, dropping the store's sync success rate to 87.5% – 88.89%.
* **Root Cause:** The catalog sync script initially called `POST /v3/categories` unconditionally on every run. Omnisend does not allow creating categories that already exist.
* **Resolution:** Switched to a **GET-first pattern**: the sync queries `GET /v3/categories`, maps existing IDs into a `Set`, and only calls `POST` for newly created categories.

### 2. Product Schema Rejections
* **Symptom:** Products returned `400 Bad Request` or `422 Unprocessable Entity`.
* **Root Cause:** Omnisend's Product API strictly requires `productUrl`, variant `id`, and variant `url`.
* **Resolution:** Formatted product payloads to provide all required top-level and variant URL fields, ensuring valid schema compliance.

### 3. Vercel Lambda Bundling Crashes (`FUNCTION_INVOCATION_FAILED`)
* **Symptom:** Serverless endpoints crashed on deployment with runtime module resolution errors.
* **Root Cause:** Functions inside `api/omnisend/*.ts` attempted to import files across directories (from `server/` or `client/`). Vercel packages each serverless function into an isolated lambda bundle, breaking cross-directory relative paths.
* **Resolution:** Inlined all fetch calls and database queries directly within the serverless function files.

### 4. Vercel Nested Subdirectory 404 Routing Trap
* **Symptom:** Requests to `/api/omnisend/*` returned `404 Not Found` on Vercel production.
* **Root Cause:** Vercel automatically exposes files in the root of `/api` but does not auto-discover arbitrary nested subdirectory structures without explicit configuration.
* **Resolution:** Created top-level proxy files (`api/omnisend-*.ts`) and configured explicit rewrite rules in `vercel.json`.

### 5. Disconnected Order Revenue ("Sales: NPR 0.00" in Automations)
* **Symptom:** The abandoned cart email automation was triggered, but the "Sales: NPR 0.00" metric never updated when users bought items.
* **Root Cause:** In production, the React frontend places orders directly via Supabase RPC (`place_order_with_coupon`), bypassing the Express server. The frontend checkout dialog was never calling the Omnisend order endpoint.
* **Resolution:** Connected an asynchronous, non-blocking call in `checkout-dialog.tsx` to `/api/omnisend/placed-order` immediately upon order creation, submitting the order to `POST /v3/orders` (with integer `orderNumber`, `createdAt` timestamp, and `orderSum` in paisa).

### 6. The 72-Hour Sliding Window Metric Delay
* **Symptom:** After fixing the 409 category conflict bug, the API health rate in Omnisend remained at ~88% instead of jumping to 100%.
* **Root Cause:** Omnisend's API log operates on a **rolling 72-hour (3-day) sliding window**. Past error logs cannot be manually cleared or reset. As time progresses, old errors naturally slide out of the window, and the success rate climbs to 100%.

---

## 4. Cross-Check Against Known Pitfalls & Security

1. **Integration Path:**
   * This project uses the **Direct API Key integration** (`X-API-KEY` for v3 and `Omnisend-API-Key` for Events API). It does not use OAuth or a marketplace app.
2. **API Key Security:**
   * `OMNISEND_API_KEY` was **never committed to GitHub** (verified via git pickaxe search across all commits).
   * It is never exposed in client-side bundles. The client only uses the public Brand ID (`6aa64ef6f9e55097b6c7ff48`) in the tracking snippet.
3. **Authentication Headers:**
   * v3 REST API (`/v3/categories`, `/v3/products`, `/v3/contacts`, `/v3/orders`): `headers: { "X-API-KEY": apiKey }`.
   * Events API (`/api/events`): `headers: { "Authorization": "Omnisend-API-Key <key>", "Omnisend-Version": "2026-03-15" }`.
4. **Origin Alignment (`origin: "api"` vs `origin: "web"`):**
   * Omnisend automation triggers configured with `origin: api` require server-side dispatch. Client-side snippet events send `origin: web`. All critical ecommerce triggers are handled server-side to guarantee automation execution.

---

## 5. What We Should Do Going Forward

1. **Automation Email Template Validation:**
   * Inside Omnisend's automation builder (for the "Hungry Hub - Abandoned Cart" workflow), verify that the email template contains the dynamic **Abandoned Cart Product Table** component so customer products and recovery links render properly inside the email.
2. **Monitor Rolling Window Aging:**
   * Allow the 72-hour sliding window to naturally expire the older 409 conflict entries from Sep 25; the API success rate will reach 100% automatically.
3. **Repository Cleanliness:**
   * Retain [`OMNISEND_INTEGRATION_PLAYBOOK.md`](./OMNISEND_INTEGRATION_PLAYBOOK.md) and [`OMNISEND_INTEGRATION_PLAYBOOK.pdf`](./OMNISEND_INTEGRATION_PLAYBOOK.pdf) as the standard architectural reference for future integrations.
