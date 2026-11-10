"use client";

import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { api, ClientApiError } from "@/lib/fetcher";
import type { CreateOrderResult } from "@/lib/types";
import {
  cartAtom,
  cartTotalAtom,
  customerAtom,
  idempotencyKeyAtom,
  kioskErrorAtom,
  orderResultAtom,
  paymentPendingAtom,
  stepAtom,
} from "@/store/kiosk";

const TIMEOUT_MS = 15_000;
const RETRYABLE = new Set(["PAYMENT_UNAVAILABLE", "INTERNAL", "RATE_LIMITED"]);

/**
 * 주문 + 결제 요청 (서버가 비밀번호 검증 → 포인트 차감 → 주문 확정을 한 번에 처리).
 * 비밀번호는 전역 상태에 두지 않고 호출 인자로만 넘긴다.
 * 비밀번호 오류는 onInvalidPin으로 돌려주고, 그 외 오류는 오류 화면으로 보낸다.
 */
export function useSubmitOrder({ onInvalidPin }: { onInvalidPin: (message: string) => void }) {
  const cart = useAtomValue(cartAtom);
  const total = useAtomValue(cartTotalAtom);
  const customer = useAtomValue(customerAtom);
  const key = useAtomValue(idempotencyKeyAtom);
  const setStep = useSetAtom(stepAtom);
  const setResult = useSetAtom(orderResultAtom);
  const setError = useSetAtom(kioskErrorAtom);
  const setPending = useSetAtom(paymentPendingAtom);

  const mutation = useMutation({
    mutationFn: async (pin: string) => {
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
      }
    },
    onSuccess: (result) => {
      setResult(result);
      setStep("done");
    },
    onError: (e) => {
      const code = e instanceof ClientApiError ? e.code : "INTERNAL";
      // 비밀번호가 틀리면 화면을 바꾸지 않고 그 자리에서 다시 입력받는다 (주문은 만들어지지 않았다)
      if (code === "INVALID_PIN") return onInvalidPin((e as ClientApiError).message);
      setError({
        code,
        message: e instanceof ClientApiError ? e.message : "결제 요청에 실패했어요",
        retryable: RETRYABLE.has(code),
      });
      setStep("error");
    },
  });

  // 결제 중에는 무입력 타이머·영업 종료 처리로 화면을 끊지 않도록 알린다
  useEffect(() => {
    setPending(mutation.isPending);
  }, [mutation.isPending, setPending]);
  useEffect(() => () => setPending(false), [setPending]);

  return mutation;
}
