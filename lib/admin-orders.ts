import { and, desc, eq, gte, like, lt, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { loadOrders } from "./orders";

export const OrdersQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["pending_payment", "failed", "received", "preparing", "ready", "completed", "cancelled"]).optional(),
  payment: z.enum(["unpaid", "paid", "failed", "refunded", "refund_failed"]).optional(),
  customerType: z.enum(["student", "teacher"]).optional(),
  q: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(200).default(30),
});
export type OrdersQueryInput = z.infer<typeof OrdersQuery>;

export function ordersWhere(q: OrdersQueryInput): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (q.from) conds.push(gte(schema.orders.businessDate, q.from));
  if (q.to) conds.push(lt(schema.orders.businessDate, nextDay(q.to)));
  if (q.status) conds.push(eq(schema.orders.status, q.status));
  if (q.payment) conds.push(eq(schema.orders.paymentStatus, q.payment));
  if (q.customerType) conds.push(eq(schema.orders.customerType, q.customerType));
  if (q.q) {
    const n = Number(q.q);
    conds.push(
      or(
        like(schema.orders.customerName, `%${q.q}%`),
        Number.isInteger(n) ? eq(schema.orders.customerId, n) : undefined,
        Number.isInteger(n) ? eq(schema.orders.orderNo, n) : undefined,
      ),
    );
  }
  return and(...conds.filter(Boolean));
}

export function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function listOrders(q: OrdersQueryInput) {
  const where = ordersWhere(q);
  const total = db.select({ n: sql<number>`count(*)` }).from(schema.orders).where(where).get()!.n;
  const rows = db
    .select()
    .from(schema.orders)
    .where(where)
    .orderBy(desc(schema.orders.createdAt))
    .limit(q.size)
    .offset((q.page - 1) * q.size)
    .all();
  return { items: loadOrders(rows), total, page: q.page, size: q.size, pages: Math.max(1, Math.ceil(total / q.size)) };
}
