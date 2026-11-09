"use client";

import { BellRing, ChefHat, CircleCheck, PackageCheck, X } from "lucide-react";
import { ShineBorder } from "@/components/ui/shine-border";
import { customerLabel, formatPoint } from "@/lib/format";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CardAction = "accept" | "ready" | "complete" | "cancel" | "recall";

function elapsed(from: string, now: number) {
  const min = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000));
  return min;
}

export function OrderCard({
  order,
  now,
  fresh,
  busy,
  onAction,
  onSeen,
}: {
  order: OrderDTO;
  now: number;
  fresh: boolean;
  busy: boolean;
  onAction: (a: CardAction) => void;
  onSeen: () => void;
}) {
  const base = order.status === "ready" ? (order.readyAt ?? order.createdAt) : (order.paidAt ?? order.createdAt);
  const min = elapsed(base, now);
  const late = order.status !== "ready" && min >= 10;
  const warn = order.status !== "ready" && min >= 5 && !late;

  return (
    <article
      onPointerDown={fresh ? onSeen : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200",
        late && "ring-2 ring-red-400",
        warn && "ring-2 ring-amber-400",
      )}
    >
      {fresh && <ShineBorder borderWidth={3} duration={6} shineColor={["#2563eb", "#60a5fa", "#93c5fd"]} />}
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-3xl leading-none font-black tabular-nums">#{order.orderNo}</p>
          <p className="mt-1.5 text-lg font-bold">{customerLabel(order)}</p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-1 text-sm font-bold tabular-nums",
              late ? "bg-red-100 text-red-700" : warn ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600",
            )}
          >
            {min === 0 ? "방금" : `${min}분`}
          </span>
          {fresh && <p className="mt-1 text-xs font-bold text-primary">NEW</p>}
        </div>
      </header>

      <ul className="my-3 space-y-1.5 border-y border-dashed py-3">
        {order.items.map((i) => (
          <li key={i.id} className="flex gap-2">
            <span className="min-w-7 rounded-md bg-primary/10 text-center font-bold text-primary tabular-nums">{i.quantity}</span>
            <span className="min-w-0">
              <span className="font-semibold">{i.name}</span>
              {i.options.length > 0 && (
                <span className="block text-sm text-muted-foreground">{i.options.map((o) => o.item).join(" · ")}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{new Date(order.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
        <span className="font-semibold text-foreground">{formatPoint(order.total)}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          disabled={busy}
          onClick={() => onAction("cancel")}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 active:scale-95 disabled:opacity-50"
          aria-label="주문 취소"
        >
          <X className="size-5" />
        </button>
        {order.status === "received" && (
          <>
            <Primary busy={busy} onClick={() => onAction("accept")} icon={ChefHat} label="접수" variant="secondary" />
            <Primary busy={busy} onClick={() => onAction("ready")} icon={BellRing} label="바로 완료" />
          </>
        )}
        {order.status === "preparing" && <Primary busy={busy} onClick={() => onAction("ready")} icon={BellRing} label="제조 완료 · 호출" />}
        {order.status === "ready" && (
          <>
            <Primary busy={busy} onClick={() => onAction("recall")} icon={BellRing} label="재호출" variant="secondary" />
            <Primary busy={busy} onClick={() => onAction("complete")} icon={PackageCheck} label="픽업 완료" />
          </>
        )}
      </div>
    </article>
  );
}

function Primary({
  busy,
  onClick,
  icon: Icon,
  label,
  variant = "primary",
}: {
  busy: boolean;
  onClick: () => void;
  icon: typeof CircleCheck;
  label: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className={cn(
        "flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-base font-bold active:scale-[0.98] disabled:opacity-50",
        variant === "primary" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}
