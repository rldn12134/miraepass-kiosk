import { handler, ok } from "@/lib/api";
import { getSession } from "@/lib/session";

export const POST = handler(async () => {
  const session = await getSession();
  session.destroy();
  return ok(null);
});
