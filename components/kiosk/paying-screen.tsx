"use client";

import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { Ripple } from "@/components/ui/ripple";
import { api, ClientApiError } from "@/lib/fetcher";
import { formatPoint } from "@/lib/format";
import type { CreateOrderResult } from "@/lib/types";
import {
  cartAtom,
  cartTotalAtom,
  customerAtom,
  idempotencyKeyAtom,
  kioskErrorAtom,
  orderResultAtom,
  pinAtom,
  pinErrorAtom,
  stepAtom,
} from "@/store/kiosk";

const TIMEOUT_MS = 15_000;
const RETRYABLE = new Set(["PAYMENT_UNAVAILABLE", "INTERNAL", "RATE_LIMITED"]);

export function PayingScreen() {
  const cart = useAtomValue(cartAtom);
  const total = useAtomValue(cartTotalAtom);
  const customer = useAtomValue(customerAtom);
  const key = useAtomValue(idempotencyKeyAtom);
  const setStep = useSetAtom(stepAtom);
  const setResult = useSetAtom(orderResultAtom);
  const setError = useSetAtom(kioskErrorAtom);
  const pin = useAtomValue(pinAtom);
  const setPin = useSetAtom(pinAtom);
  const setPinError = useSetAtom(pinErrorAtom);
  const started = useRef(false);

  const pay = useMutation({
    mutationFn: async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        return await api<CreateOrderResult>("/api/orders", {
          method: "POST",
          kiosk: true,
          signal: ctrl.signal,
          body: {
            idempotencyKey: key,
            customerId: customer!.id,
            pin,
            items: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, optionItemIds: l.optionItemIds })),
            expectedTotal: total,
          },
        });
      } finally {
        clearTimeout(timer);
        // 비밀번호는 요청 한 번에만 쓰고 바로 지운다
        setPin("");
      }
    },
    onSuccess: (result) => {
      setPinError(null);
      setResult(result);
      setStep("done");
    },
    onError: (e) => {
      const code = e instanceof ClientApiError ? e.code : "INTERNAL";
      // 비밀번호가 틀리면 비밀번호 화면으로 돌아가 다시 입력 (주문은 만들어지지 않았다)
      if (code === "INVALID_PIN") {
        setPinError({ message: (e as ClientApiError).message, at: Date.now() });
        setStep("pin");
        return;
      }
      setError({
        code,
        message: e instanceof ClientApiError ? e.message : "결제 요청에 실패했어요",
        retryable: RETRYABLE.has(code),
      });
      setStep("error");
    },
  });

  useEffect(() => {
    if (started.current || !customer) return;
    started.current = true;
    if (pin.length !== 6) {
      setStep("pin");
      return;
    }
    pay.mutate();
  }, [customer, pay, pin, setStep]);

  return (
    <div className="relative flex h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <Ripple mainCircleSize={180} numCircles={6} className="[mask-image:radial-gradient(circle,white,transparent_70%)]" />
      <BlurFade className="relative z-10 flex flex-col items-center gap-4">
        <img src="/favicon.svg" alt="" className="h-16 animate-pulse" />
        <h1 className="text-h6 font-extrabold md:text-h4">결제하고 있어요</h1>
        <p className="text-xl text-muted-foreground">
          MIRAEPASS에서 <span className="font-bold text-primary">{formatPoint(total)}</span>를 결제하는 중이에요
        </p>
        <p className="text-muted-foreground">화면을 닫지 말고 잠시만 기다려 주세요</p>
      </BlurFade>
    </div>
  );
}
