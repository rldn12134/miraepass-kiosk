"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { formatPoint } from "@/lib/format";
import type { CategoryDTO, MenuItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { activeCategoryAtom, addToCartAtom, cartCountAtom, cartTotalAtom, stepAtom } from "@/store/kiosk";
import { CartList } from "./cart-list";
import { MenuCard } from "./menu-card";
import { OptionDialog } from "./option-dialog";

export function MenuScreen({ menu, onHome }: { menu: CategoryDTO[]; onHome: () => void }) {
  const [activeId, setActiveId] = useAtom(activeCategoryAtom);
  const setStep = useSetAtom(stepAtom);
  const addToCart = useSetAtom(addToCartAtom);
  const count = useAtomValue(cartCountAtom);
  const total = useAtomValue(cartTotalAtom);
  const [selected, setSelected] = useState<{ item: MenuItemDTO; emoji: string } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const categories = useMemo(() => menu.filter((c) => c.items.length > 0), [menu]);
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  const goReview = () => {
    setCartOpen(false);
    setStep("review");
  };

  return (
    <div className="flex h-dvh flex-col lg:grid lg:grid-cols-[148px_1fr_360px] xl:grid-cols-[168px_1fr_400px]">
      {/* 카테고리: 세로(가로 태블릿) / 가로 스크롤(세로 태블릿·모바일) */}
      <nav className="flex shrink-0 flex-col bg-white lg:h-dvh lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 lg:flex-col lg:px-3 lg:pt-6">
          <button onClick={onHome} className="flex items-center gap-2" aria-label="처음으로">
            <img src="/favicon.svg" alt="" className="h-8 lg:h-10" />
            <span className="text-lg font-extrabold lg:hidden">미래카페</span>
          </button>
          <span className="text-sm text-muted-foreground lg:hidden">MIRAEPASS 결제</span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] lg:flex-col lg:overflow-y-auto lg:px-3 lg:py-6">
          {categories.map((c) => {
            const on = c.id === active?.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-lg font-bold transition active:scale-95 lg:flex-col lg:gap-1 lg:px-2 lg:py-4",
                  on ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "bg-slate-100 text-slate-600",
                )}
              >
                <span className="tossface text-2xl lg:text-4xl">{c.emoji}</span>
                <span className="whitespace-nowrap">{c.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 메뉴 그리드 */}
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-28 md:px-6 lg:h-dvh lg:pt-6 lg:pb-6">
        {active && (
          <>
            <h2 className="mb-4 hidden items-center gap-2 text-3xl font-extrabold lg:flex">
              <span className="tossface">{active.emoji}</span>
              {active.name}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {active.items.map((item) => (
                <MenuCard key={item.id} item={item} emoji={active.emoji} onSelect={() => setSelected({ item, emoji: active.emoji })} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* 장바구니: 가로 태블릿 이상은 우측 패널 */}
      <aside className="hidden h-dvh flex-col border-l bg-slate-50 lg:flex">
        <div className="flex items-center justify-between px-5 pt-6 pb-3">
          <h2 className="text-2xl font-extrabold">주문 목록</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 font-bold text-primary">{count}개</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <CartList />
        </div>
        <CheckoutBar count={count} total={total} onNext={goReview} />
      </aside>

      {/* 세로 태블릿·모바일: 하단 고정 바 + 드로어 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="flex gap-3">
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex h-16 flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 active:scale-[0.98]"
          >
            <ShoppingBag className="size-7" />
            <span className="text-left">
              <span className="block text-sm text-muted-foreground">주문 목록 {count}개</span>
              <span className="block text-xl font-bold">{formatPoint(total)}</span>
            </span>
          </button>
          <button
            onClick={goReview}
            disabled={count === 0}
            className="h-16 rounded-2xl bg-primary px-8 text-xl font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
          >
            주문하기
          </button>
        </div>
      </div>
      <Drawer open={cartOpen} onOpenChange={setCartOpen}>
        <DrawerContent className="max-h-[85dvh] bg-slate-50">
          <DrawerTitle className="px-5 pt-2 text-2xl font-extrabold">주문 목록</DrawerTitle>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <CartList />
          </div>
          <CheckoutBar count={count} total={total} onNext={goReview} />
        </DrawerContent>
      </Drawer>

      <OptionDialog
        item={selected?.item ?? null}
        emoji={selected?.emoji ?? "☕"}
        onClose={() => setSelected(null)}
        onAdd={(optionItemIds, quantity) => {
          if (selected) addToCart({ item: selected.item, optionItemIds, quantity });
          setSelected(null);
        }}
      />
    </div>
  );
}

function CheckoutBar({ count, total, onNext }: { count: number; total: number; onNext: () => void }) {
  return (
    <div className="space-y-3 border-t bg-white p-4 md:p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-semibold">합계</span>
        <span className="text-3xl font-extrabold text-primary">
          <span className="tabular-nums">{total.toLocaleString("ko-KR")}</span>P
        </span>
      </div>
      <button
        onClick={onNext}
        disabled={count === 0}
        className="h-16 w-full rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
      >
        주문하기
      </button>
    </div>
  );
}
