import { handler, ok, requireKiosk } from "@/lib/api";

export const POST = handler(async (req) => {
  requireKiosk(req);
  return ok({ valid: true });
});
