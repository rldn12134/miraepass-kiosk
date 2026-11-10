"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { candidateHonorific, formatPoint } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cartTotalAtom, customerAtom, stepAtom } from "@/store/kiosk";
import { NumericKeypad } from "./numeric-keypad";
import { StepHeader } from "./step-header";
import { useSubmitOrder } from "./use-submit-order";

const LENGTH = 6;

/**
 * 키오스크 결제 비밀번호 입력 + 결제.
 *
 * 6자리를 채우면 이 화면에서 바로 결제를 요청한다 (서버가 비밀번호 검증 → 포인트 차감 → 주문 확정).
 * 예전에는 별도의 '결제 중' 화면으로 넘어갔다가 비밀번호가 틀리면 돌아와서, 응답이 빠를 때 화면이 깜박였다.
 * 지금은 화면을 바꾸지 않고 상태 줄(높이 고정)만 '확인 중' → '오류 안내'로 바꾼다.
 */
export function PinScreen({ shuffle, onHome }: { shuffle: boolean; onHome: () => void }) {
  const setStep = useSetAtom(stepAtom);
  const customer = useAtomValue(customerAtom);
  const total = useAtomValue(cartTotalAtom);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<{ message: string; at: number } | null>(null);

  const submit = useSubmitOrder({
    onInvalidPin: (message) => {
      setPin("");
      setError({ message, at: Date.now() });
    },
  });
  const busy = submit.isPending;

  if (!customer) return null;

  const type = (d: string) => {
    if (busy || pin.length >= LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === LENGTH) submit.mutate(next);
  };

  return (
    <div className="flex h-dvh flex-col">
      <StepHeader
        current={3}
        title="결제 비밀번호"
        onBack={busy ? undefined : () => setStep("identify")}
        onHome={busy ? undefined : onHome}
      />
      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-6 overflow-y-auto px-4 pb-6 md:grid-cols-2 md:items-center md:gap-10 md:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <LockKeyhole className="size-10 text-primary" />
          </span>
          <div>
            <p className="text-2xl font-bold">{candidateHonorific(customer)}</p>
            <p className="mt-1 text-lg text-muted-foreground">MIRAEPASS 키오스크 비밀번호 6자리를 입력해 주세요</p>
          </div>
          <motion.div
            key={error?.at ?? 0}
            animate={error ? { x: [0, -14, 14, -10, 10, 0] } : undefined}
            transition={{ duration: 0.4 }}
            className="flex gap-3"
            aria-label={`${pin.length}자리 입력됨`}
          >
            {Array.from({ length: LENGTH }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-5 rounded-full transition-colors md:size-6",
                  i < pin.length ? "bg-primary" : error ? "bg-destructive/30" : "bg-slate-300",
                )}
              />
            ))}
          </motion.div>

          {/* 상태 줄: 높이를 미리 잡아 두어 안내가 바뀌어도 화면이 움직이지 않는다 */}
          <div className="flex min-h-11 items-center justify-center" role="status" aria-live="polite">
            {busy ? (
              <p className="flex items-center gap-2 font-semibold text-primary">
                <Loader2 className="size-5 animate-spin" />
                비밀번호를 확인하고 결제하는 중이에요
              </p>
            ) : error ? (
              <p role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 font-semibold text-destructive">
                <AlertTriangle className="size-5 shrink-0" />
                {error.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-white px-6 py-3 text-lg shadow-sm">
            결제 금액 <span className="font-extrabold text-primary">{formatPoint(total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">비밀번호는 MIRAEPASS 앱에서 설정·변경할 수 있어요</p>
        </div>
        <NumericKeypad
          // 비밀번호가 틀릴 때마다 숫자 배열을 새로 섞는다 (키패드만 바뀌고 화면은 그대로)
          key={error?.at ?? 0}
          shuffle={shuffle}
          onDigit={type}
          onDelete={() => !busy && setPin((v) => v.slice(0, -1))}
          onClear={() => !busy && setPin("")}
          className={cn("transition-opacity", busy && "pointer-events-none opacity-60")}
        />
      </div>
    </div>
  );
}
