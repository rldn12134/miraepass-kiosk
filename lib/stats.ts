import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { nextDay } from "./admin-orders";
import { db, schema } from "./db";
import type { StatsResponse } from "./types";

const SOLD = ["received", "preparing", "ready", "completed"] as const;

export function getStats(from: string, to: string): StatsResponse {
  const o = schema.orders;
  const inRange = and(gte(o.businessDate, from), lt(o.businessDate, nextDay(to)));
  const sold = and(inRange, inArray(o.status, [...SOLD]));

  const kpiRow = db
    .select({ revenue: sql<number>`coalesce(sum(${o.total}), 0)`, orders: sql<number>`count(*)` })
    .from(o)
    .where(sold)
    .get()!;
  const cancelled = db.select({ n: sql<number>`count(*)` }).from(o).where(and(inRange, eq(o.status, "cancelled"))).get()!.n;
  const refundFailed = db.select({ n: sql<number>`count(*)` }).from(o).where(eq(o.paymentStatus, "refund_failed")).get()!.n;

  const dailyRows = db
    .select({ date: o.businessDate, revenue: sql<number>`sum(${o.total})`, orders: sql<number>`count(*)` })
    .from(o)
    .where(sold)
    .groupBy(o.businessDate)
    .all();
  const dailyMap = new Map(dailyRows.map((r) => [r.date, r]));
  const daily: StatsResponse["daily"] = [];
  for (let d = from; d <= to; d = nextDay(d)) {
    const r = dailyMap.get(d);
    daily.push({ date: d, revenue: r?.revenue ?? 0, orders: r?.orders ?? 0 });
    if (daily.length > 400) break;
  }

  const hourExpr = sql<number>`cast(strftime('%H', ${o.createdAt} / 1000, 'unixepoch', '+9 hours') as integer)`;
  const hourlyRows = db.select({ hour: hourExpr, orders: sql<number>`count(*)` }).from(o).where(sold).groupBy(hourExpr).all();
  const hourlyMap = new Map(hourlyRows.map((r) => [r.hour, r.orders]));
  const hours = hourlyRows.map((r) => r.hour);
  const minH = Math.min(8, ...hours);
  const maxH = Math.max(17, ...hours);
  const hourly = Array.from({ length: maxH - minH + 1 }, (_, i) => ({ hour: minH + i, orders: hourlyMap.get(minH + i) ?? 0 }));

  const i = schema.orderItems;
  const topMenus = db
    .select({
      name: i.nameSnapshot,
      quantity: sql<number>`sum(${i.quantity})`,
      revenue: sql<number>`sum(${i.quantity} * ${i.unitPrice})`,
    })
    .from(i)
    .innerJoin(o, eq(o.id, i.orderId))
    .where(sold)
    .groupBy(i.nameSnapshot)
    .orderBy(sql`sum(${i.quantity}) desc`)
    .limit(10)
    .all();

  const customerMix = db
    .select({ type: o.customerType, orders: sql<number>`count(*)`, revenue: sql<number>`sum(${o.total})` })
    .from(o)
    .where(sold)
    .groupBy(o.customerType)
    .all();

  return {
    range: { from, to },
    kpi: {
      revenue: kpiRow.revenue,
      orders: kpiRow.orders,
      avgTicket: kpiRow.orders ? Math.round(kpiRow.revenue / kpiRow.orders) : 0,
      cancelled,
      refundFailed,
    },
    daily,
    hourly,
    topMenus,
    customerMix,
  };
}
