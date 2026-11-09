"use client";

import { ChevronLeft, House } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["메뉴 선택", "주문 확인", "본인 확인", "결제"] as const;

export function StepHeader({
  current,
  title,
  onBack,
  onHome,
}: {
  current: 0 | 1 | 2 | 3;
  title: string;
  onBack?: () => void;
  onHome?: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 px-4 pt-4 pb-3 md:px-8 md:pt-6">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm active:scale-95 md:size-14"
          aria-label="이전"
        >
          <ChevronLeft className="size-7" />
        </button>
      ) : (
        <div className="size-12 md:size-14" />
      )}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
        <h1 className="truncate text-2xl font-bold md:text-3xl">{title}</h1>
        <ol className="flex items-center gap-1.5" aria-label="진행 단계">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === current ? "w-8 bg-primary" : i < current ? "w-3 bg-primary/50" : "w-3 bg-slate-300",
                )}
              />
              <span className="sr-only">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      {onHome ? (
        <button
          onClick={onHome}
          className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm active:scale-95 md:size-14"
          aria-label="처음으로"
        >
          <House className="size-6" />
        </button>
      ) : (
        <div className="size-12 md:size-14" />
      )}
    </header>
  );
}
