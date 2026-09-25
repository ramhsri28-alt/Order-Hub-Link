import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./omnisend/sync-products";

export default async function(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
