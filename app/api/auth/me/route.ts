import { handler, ok } from "@/lib/api";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const GET = handler(async () => {
  const session = await getSession();
  return ok(session.user ?? null);
});
