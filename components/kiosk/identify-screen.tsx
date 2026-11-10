"use client";

import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { AlertTriangle, IdCard, Loader2 } from "lucide-react";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/fetcher";
import { candidateLabel } from "@/lib/format";
import type { CustomerCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { cartTotalAtom, customerAtom, idempotencyKeyAtom, newIdempotencyKey, pinAtom, pinErrorAtom, stepAtom } from "@/store/kiosk";
import { NumericKeypad } from "./numeric-keypad";
import { StepHeader } from "./step-header";

const ID_LENGTH = 4;

/** MIRAEPASS ID 4자리 입력: 학생은 학번, 교사는 고유 번호 */
export function IdentifyScreen({ onHome }: { onHome: () => void }) {
  const setStep = useSetAtom(stepAtom);
  const setCustomer = useSetAtom(customerAtom);
  const setKey = useSetAtom(idempotencyKeyAtom);
  const setPin = useSetAtom(pinAtom);
  const setPinError = useSetAtom(pinErrorAtom);
  const total = useAtomValue(cartTotalAtom);
  const [id, setId] = useState("");
  const [insufficient, setInsufficient] = useState<CustomerCandidate | null>(null);

  const lookup = useMutation({
    mutationFn: (value: string) =>
      api<CustomerCandidate>("/api/customers/lookup", { method: "POST", kiosk: true, body: { id: Number(value), amount: total } }),
    onSuccess: (c) => {
      // 잔액이 확실히 부족하면 비밀번호를 받기 전에 알려준다 (최종 판정은 결제 시점)
      if (c.sufficient === false) return setInsufficient(c);
      setCustomer(c);
      setKey(newIdempotencyKey());
      setPin("");
      setPinError(null);
      setStep("pin");
    },
  });

  const type = (d: string) => {
    lookup.reset();
    setInsufficient(null);
    setId((v) => (v.length < ID_LENGTH ? v + d : v));
  };
  const clear = () => {
    lookup.reset();
    setInsufficient(null);
    setId("");
  };

  const error = insufficient
    ? `${candidateLabel(insufficient)}님, 포인트가 부족해요`
    : lookup.error instanceof ClientApiError
      ? lookup.error.message
      : lookup.error
        ? "조회에 실패했어요"
        : null;

  return (
    <div className="flex h-dvh flex-col">
      <StepHeader current={2} title="MIRAEPASS ID를 입력해 주세요" onBack={() => setStep("review")} onHome={onHome} />
      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-6 overflow-y-auto px-4 pb-6 md:grid-cols-2 md:items-center md:gap-10 md:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <IdCard className="size-10 text-primary" />
          </span>
          <div className="space-y-1.5">
            <p className="text-xl font-semibold">학번 또는 교사 ID 4자리</p>
            <p className="text-muted-foreground">
              학생은 학번이에요. 예) 3학년 4반 12번 → <b className="text-foreground">3412</b>
            </p>
          </div>
          <div className="mt-1 flex gap-2.5" aria-label={`입력한 ID ${id}`}>
            {Array.from({ length: ID_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "flex size-16 items-center justify-center rounded-2xl bg-white text-4xl font-bold tabular-nums shadow-sm md:size-18",
                  i === id.length && !lookup.isPending && "ring-2 ring-primary",
                )}
              >
                {id[i] ?? ""}
              </span>
            ))}
          </div>
          {error && (
            <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 font-semibold text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              {error}
            </p>
          )}
          <button
            disabled={id.length !== ID_LENGTH || lookup.isPending}
            onClick={() => lookup.mutate(id)}
            className="mt-1 flex h-16 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
          >
            {lookup.isPending && <Loader2 className="size-6 animate-spin" />}
            다음
          </button>
        </div>
        <NumericKeypad onDigit={type} onDelete={() => { lookup.reset(); setInsufficient(null); setId((v) => v.slice(0, -1)); }} onClear={clear} />
      </div>
    </div>
  );
}
