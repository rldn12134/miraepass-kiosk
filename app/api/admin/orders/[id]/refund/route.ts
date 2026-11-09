import { handler, idParam, ok, requireUser } from "@/lib/api";
import { retryRefund } from "@/lib/orders";

export const POST = handler<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser("admin");
  return ok(await retryRefund(idParam((await params).id), user));
});
