"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cartCountAtom, cartTotalAtom, stepAtom } from "@/store/kiosk";
import { CartList } from "./cart-list";
import { StepHeader } from "./step-header";

export function ReviewScreen({ onHome }: { onHome: () => void }) {
  const setStep = useSetAtom(stepAtom);
  const count = useAtomValue(cartCountAtom);
  const total = useAtomValue(cartTotalAtom);

  // 장바구니를 모두 비우면 메뉴로
  useEffect(() => {
    if (count === 0) setStep("menu");
  }, [count, setStep]);

  return (
    <div className="flex h-dvh flex-col">
      <StepHeader current={1} title="주문 내역을 확인해 주세요" onBack={() => setStep("menu")} onHome={onHome} />
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 md:px-8">
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          <CartList size="lg" />
        </div>
        <div className="space-y-4 py-4 md:py-6">
          <div className="flex items-baseline justify-between rounded-3xl bg-white p-5 shadow-sm md:p-6">
            <span className="text-xl font-semibold">총 {count}개</span>
            <span className="text-4xl font-extrabold text-primary md:text-5xl">
              <span className="tabular-nums">{total.toLocaleString("ko-KR")}</span>P
            </span>
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <button
              onClick={() => setStep("menu")}
              className="h-18 rounded-2xl bg-white text-xl font-semibold shadow-sm active:scale-[0.98] md:h-20"
            >
              메뉴 추가
            </button>
            <ShimmerButton
              onClick={() => setStep("identify")}
              background="var(--color-primary)"
              borderRadius="1rem"
              shimmerColor="#bfdbfe"
              className="h-18 text-2xl font-bold md:h-20"
            >
              결제하기
            </ShimmerButton>
          </div>
        </div>
      </div>
    </div>
  );
}
