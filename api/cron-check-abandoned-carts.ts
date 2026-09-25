import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./cron/check-abandoned-carts";

export default async function(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
