import { handler, ok, requireUser } from "@/lib/api";
import { listOrders, OrdersQuery } from "@/lib/admin-orders";

export const dynamic = "force-dynamic";
export const GET = handler(async (req) => {
  await requireUser("admin");
  const q = OrdersQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(listOrders(q));
});
