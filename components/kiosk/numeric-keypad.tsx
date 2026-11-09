"use client";

import { Delete } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** 큰 터치용 숫자 키패드. shuffle=true면 숫자 배열을 섞는다 (결제 비밀번호용) */
export function NumericKeypad({
  onDigit,
  onDelete,
  onClear,
  shuffle = false,
  className,
  keyClassName,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onClear: () => void;
  shuffle?: boolean;
  className?: string;
  keyClassName?: string;
}) {
  // 마운트 시 한 번만 섞는다 (화면에 들어올 때마다 새 배열)
  const [digits] = useState(() => {
    const base = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    if (!shuffle) return base;
    const arr = [...base];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const keys = [...digits.slice(0, 9), "clear", digits[9], "del"];
  const base =
    "flex h-16 items-center justify-center rounded-2xl text-3xl font-semibold transition active:scale-95 md:h-20";

  return (
    <div className={cn("grid grid-cols-3 gap-2.5 md:gap-3", className)}>
      {keys.map((k) =>
        k === "clear" ? (
          <button key={k} onClick={onClear} className={cn(base, "bg-slate-200 text-lg text-slate-600", keyClassName)}>
            전체삭제
          </button>
        ) : k === "del" ? (
          <button key={k} onClick={onDelete} className={cn(base, "bg-slate-200 text-slate-600", keyClassName)} aria-label="지우기">
            <Delete className="size-8" />
          </button>
        ) : (
          <button key={k} onClick={() => onDigit(k)} className={cn(base, "bg-white shadow-sm", keyClassName)}>
            {k}
          </button>
        ),
      )}
    </div>
  );
}
