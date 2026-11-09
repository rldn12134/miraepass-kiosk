import { handler, ok, requireUser } from "@/lib/api";
import { getActiveOrders, getTodayClosedOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const GET = handler(async () => {
  await requireUser("staff");
  return ok({ active: getActiveOrders(), closedToday: getTodayClosedOrders() });
});
