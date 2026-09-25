import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./omnisend/placed-order";

export default async function(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}
