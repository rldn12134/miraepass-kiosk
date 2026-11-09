import { handler, idParam, ok, requireUser } from "@/lib/api";
import { recallOrder } from "@/lib/orders";

export const POST = handler<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser("staff");
  return ok(recallOrder(idParam((await params).id), user));
});
