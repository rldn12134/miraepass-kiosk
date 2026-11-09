import { desc } from "drizzle-orm";
import { handler, requireUser } from "@/lib/api";
import { OrdersQuery, ordersWhere } from "@/lib/admin-orders";
import { db, schema } from "@/lib/db";
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { loadOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const GET = handler(async (req) => {
  await requireUser("admin");
  const q = OrdersQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const rows = db.select().from(schema.orders).where(ordersWhere(q)).orderBy(desc(schema.orders.createdAt)).all();
  const header = ["주문일", "주문번호", "주문시각", "구분", "고객ID", "이름", "학년", "품목", "합계", "주문상태", "결제상태", "취소사유"];
  const lines = loadOrders(rows).map((o) =>
    [
      o.businessDate,
      o.orderNo,
      new Date(o.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
      o.customerType === "teacher" ? "교사" : "학생",
      o.customerId,
      o.customerName,
      o.customerGrade ?? "",
      o.items
        .map((i) => `${i.name}${i.options.length ? `(${i.options.map((x) => x.item).join("/")})` : ""} x${i.quantity}`)
        .join(", "),
      o.total,
      STATUS_LABEL[o.status],
      PAYMENT_LABEL[o.paymentStatus],
      o.cancelReason ?? "",
    ]
      .map(esc)
      .join(","),
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cafe-orders-${q.from ?? "all"}_${q.to ?? "all"}.csv"`,
    },
  });
});
