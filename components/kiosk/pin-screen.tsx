"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { candidateLabel, formatPoint } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cartTotalAtom, customerAtom, pinAtom, pinErrorAtom, stepAtom } from "@/store/kiosk";
import { NumericKeypad } from "./numeric-keypad";
import { StepHeader } from "./step-header";

const LENGTH = 6;

/**
 * 키오스크 결제 비밀번호 입력. 6자리를 채우면 결제 단계로 넘어가고,
 * 검증은 서버가 결제 요청과 함께 MIRAEPASS에 맡긴다. 틀리면 이 화면으로 돌아와 안내를 보여준다.
 */
export function PinScreen({ shuffle, onHome }: { shuffle: boolean; onHome: () => void }) {
  const setStep = useSetAtom(stepAtom);
  const setPinAtom = useSetAtom(pinAtom);
  const pinError = useAtomValue(pinErrorAtom);
  const setPinError = useSetAtom(pinErrorAtom);
  const customer = useAtomValue(customerAtom);
  const total = useAtomValue(cartTotalAtom);
  const [pin, setPin] = useState("");

  if (!customer) return null;

  const type = (d: string) => {
    if (pin.length >= LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === LENGTH) {
      setPinAtom(next);
      setStep("paying");
    }
  };

  return (
    <div className="flex h-dvh flex-col">
      <StepHeader
        current={3}
        title="결제 비밀번호"
        onBack={() => {
          setPinError(null);
          setStep("identify");
        }}
        onHome={onHome}
      />
      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-6 overflow-y-auto px-4 pb-6 md:grid-cols-2 md:items-center md:gap-10 md:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <LockKeyhole className="size-10 text-primary" />
          </span>
          <div>
            <p className="text-2xl font-bold">{candidateLabel(customer)}님</p>
            <p className="mt-1 text-lg text-muted-foreground">MIRAEPASS 키오스크 비밀번호 6자리를 입력해 주세요</p>
          </div>
          <motion.div
            key={pinError?.at ?? 0}
            animate={pinError ? { x: [0, -14, 14, -10, 10, 0] } : undefined}
            transition={{ duration: 0.4 }}
            className="flex gap-3"
            aria-label={`${pin.length}자리 입력됨`}
          >
            {Array.from({ length: LENGTH }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-5 rounded-full transition-all md:size-6",
                  i < pin.length ? "scale-110 bg-primary" : pinError ? "bg-destructive/30" : "bg-slate-300",
                )}
              />
            ))}
          </motion.div>
          {pinError && (
            <p role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 font-semibold text-destructive">
              <AlertTriangle className="size-5 shrink-0" />
              {pinError.message}
            </p>
          )}
          <div className="rounded-2xl bg-white px-6 py-3 text-lg shadow-sm">
            결제 금액 <span className="font-extrabold text-primary">{formatPoint(total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">비밀번호는 MIRAEPASS 앱에서 설정·변경할 수 있어요</p>
        </div>
        <NumericKeypad
          shuffle={shuffle}
          onDigit={type}
          onDelete={() => setPin((v) => v.slice(0, -1))}
          onClear={() => setPin("")}
        />
      </div>
    </div>
  );
}
