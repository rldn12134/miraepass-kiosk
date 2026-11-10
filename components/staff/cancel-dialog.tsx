"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { customerHonorific, formatPoint } from "@/lib/format";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

const REASONS = ["재료 소진", "고객 요청", "중복 주문", "기기 오류", "기타"];

export function CancelDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: OrderDTO | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  return (
    <AlertDialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        {order && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>#{order.orderNo} 주문을 취소할까요?</AlertDialogTitle>
              <AlertDialogDescription>
                {customerHonorific(order)}께 {formatPoint(order.total)}가 MIRAEPASS 포인트로 자동 환불돼요.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold",
                    reason === r ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>닫기</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onConfirm(reason)}>
                취소하고 환불
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
