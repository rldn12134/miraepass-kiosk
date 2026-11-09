import { handler, idParam, ok, requireUser } from "@/lib/api";
import { getOrder, getOrderActions } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const GET = handler<{ id: string }>(async (_req, { params }) => {
  await requireUser("admin");
  const id = idParam((await params).id);
  return ok({ order: getOrder(id), actions: getOrderActions(id) });
});
