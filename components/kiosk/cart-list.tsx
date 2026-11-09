"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { Minus, Plus, X } from "lucide-react";
import { formatPoint } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cartAtom, removeLineAtom, updateQuantityAtom } from "@/store/kiosk";

export function CartList({ size = "md", emptyText = "메뉴를 선택해 주세요" }: { size?: "md" | "lg"; emptyText?: string }) {
  const cart = useAtomValue(cartAtom);
  const update = useSetAtom(updateQuantityAtom);
  const remove = useSetAtom(removeLineAtom);

  if (cart.length === 0) {
    return <p className="py-10 text-center text-muted-foreground">{emptyText}</p>;
  }
  const lg = size === "lg";
  return (
    <ul className="space-y-2.5">
      {cart.map((l) => (
        <li key={l.key} className={cn("rounded-2xl bg-white shadow-sm", lg ? "p-4 md:p-5" : "p-3")}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className={cn("font-bold", lg ? "text-xl" : "text-base")}>{l.name}</p>
              {l.options.length > 0 && (
                <p className={cn("text-muted-foreground", lg ? "text-base" : "text-sm")}>
                  {l.options.map((o) => o.item + (o.extra ? ` +${o.extra}` : "")).join(" · ")}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(l.key)}
              className="-m-1 flex size-9 items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
              aria-label={`${l.name} 삭제`}
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => update({ key: l.key, delta: -1 })}
                className={cn("flex items-center justify-center rounded-full bg-slate-100 active:scale-95", lg ? "size-11" : "size-9")}
                aria-label="수량 줄이기"
              >
                <Minus className="size-5" />
              </button>
              <span className={cn("w-6 text-center font-bold tabular-nums", lg ? "text-xl" : "text-lg")}>{l.quantity}</span>
              <button
                onClick={() => update({ key: l.key, delta: 1 })}
                className={cn("flex items-center justify-center rounded-full bg-slate-100 active:scale-95", lg ? "size-11" : "size-9")}
                aria-label="수량 늘리기"
              >
                <Plus className="size-5" />
              </button>
            </div>
            <span className={cn("font-bold", lg ? "text-xl" : "text-base")}>{formatPoint(l.unitPrice * l.quantity)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
