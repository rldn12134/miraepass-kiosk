import { Suspense } from "react";
import { OrdersView } from "@/components/admin/orders-view";

export const metadata = { title: "주문 기록" };

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}
