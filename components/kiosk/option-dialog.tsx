"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatPoint } from "@/lib/format";
import { defaultOptionIds } from "@/lib/pricing";
import type { MenuItemDTO, MenuOptionGroupDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MenuThumb } from "./menu-thumb";

export function OptionDialog({
  item,
  emoji,
  onClose,
  onAdd,
}: {
  item: MenuItemDTO | null;
  emoji: string;
  onClose: () => void;
  onAdd: (optionItemIds: number[], quantity: number) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl"
      >
        {item && <OptionForm key={item.id} item={item} emoji={emoji} onClose={onClose} onAdd={onAdd} />}
      </DialogContent>
    </Dialog>
  );
}

function OptionForm({
  item,
  emoji,
  onClose,
  onAdd,
}: {
  item: MenuItemDTO;
  emoji: string;
  onClose: () => void;
  onAdd: (optionItemIds: number[], quantity: number) => void;
}) {
  const [selected, setSelected] = useState<number[]>(() => defaultOptionIds(item));
  const [quantity, setQuantity] = useState(1);

  const toggle = (group: MenuOptionGroupDTO, optionId: number) => {
    setSelected((prev) => {
      const groupIds = group.items.map((o) => o.id);
      const inGroup = prev.filter((id) => groupIds.includes(id));
      const others = prev.filter((id) => !groupIds.includes(id));
      if (inGroup.includes(optionId)) {
        // 필수 단일 선택은 해제 불가
        if (group.required && inGroup.length <= Math.max(1, group.minSelect)) return prev;
        return [...others, ...inGroup.filter((id) => id !== optionId)];
      }
      if (group.maxSelect === 1) return [...others, optionId];
      if (inGroup.length >= group.maxSelect) return prev;
      return [...others, ...inGroup, optionId];
    });
  };

  const extra = item.optionGroups
    .flatMap((g) => g.items)
    .filter((o) => selected.includes(o.id))
    .reduce((s, o) => s + o.extraPrice, 0);
  const unit = item.price + extra;
  const valid = item.optionGroups.every((g) => {
    const n = g.items.filter((o) => selected.includes(o.id)).length;
    const min = g.required ? Math.max(1, g.minSelect) : g.minSelect;
    return n >= min && n <= g.maxSelect;
  });

  return (
    <>
      <div className="flex items-center gap-4 border-b bg-white p-5 md:p-6">
        <MenuThumb imageUrl={item.imageUrl} emoji={emoji} name={item.name} className="size-24 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <DialogTitle className="text-2xl font-bold">{item.name}</DialogTitle>
          <DialogDescription className="mt-1 text-base">{item.description || " "}</DialogDescription>
          <p className="mt-2 text-xl font-bold text-primary">{formatPoint(item.price)}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-5 md:p-6">
        {item.optionGroups.length === 0 && <p className="py-4 text-center text-muted-foreground">선택할 옵션이 없어요</p>}
        {item.optionGroups.map((g) => (
          <section key={g.id}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="text-lg font-bold">{g.name}</h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  g.required ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-600",
                )}
              >
                {g.required ? "필수" : "선택"}
              </span>
              {g.maxSelect > 1 && <span className="text-sm text-muted-foreground">최대 {g.maxSelect}개</span>}
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {g.items.map((o) => {
                const on = selected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(g, o.id)}
                    className={cn(
                      "relative flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 bg-white px-3 py-2 text-center transition active:scale-95",
                      on ? "border-primary bg-primary/5 text-primary" : "border-transparent shadow-sm",
                    )}
                  >
                    {on && <Check className="absolute top-2 right-2 size-4" />}
                    <span className="text-lg font-semibold">{o.name}</span>
                    {o.extraPrice > 0 && <span className="text-sm opacity-80">+{formatPoint(o.extraPrice)}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="space-y-4 border-t bg-white p-5 md:p-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">수량</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex size-12 items-center justify-center rounded-full bg-slate-100 active:scale-95"
              aria-label="수량 줄이기"
            >
              <Minus className="size-6" />
            </button>
            <span className="w-8 text-center text-2xl font-bold tabular-nums">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="flex size-12 items-center justify-center rounded-full bg-slate-100 active:scale-95"
              aria-label="수량 늘리기"
            >
              <Plus className="size-6" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button onClick={onClose} className="h-16 rounded-2xl bg-slate-100 text-lg font-semibold active:scale-[0.98]">
            취소
          </button>
          <button
            disabled={!valid}
            onClick={() => onAdd(selected, quantity)}
            className="h-16 rounded-2xl bg-primary text-lg font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
          >
            {formatPoint(unit * quantity)} 담기
          </button>
        </div>
      </div>
    </>
  );
}
