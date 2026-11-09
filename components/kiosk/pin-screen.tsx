"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { LockKeyhole } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatPoint } from "@/lib/format";
import { verifyPaymentPin } from "@/lib/payment-pin";
import { cn } from "@/lib/utils";
import { cartTotalAtom, customerAtom, stepAtom } from "@/store/kiosk";
import { NumericKeypad } from "./numeric-keypad";
import { StepHeader } from "./step-header";

const LENGTH = 6;

export function PinScreen({ shuffle, onHome }: { shuffle: boolean; onHome: () => void }) {
  const setStep = useSetAtom(stepAtom);
  const customer = useAtomValue(customerAtom);
  const total = useAtomValue(cartTotalAtom);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (pin.length !== LENGTH || !customer) return;
    let cancelled = false;
    verifyPaymentPin(customer.id, pin).then((ok) => {
      if (cancelled) return;
      if (ok) setStep("paying");
      else {
        setShake((s) => s + 1);
        setPin("");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pin, customer, setStep]);

  if (!customer) return null;
  const who = customer.type === "student" ? `${customer.grade}학년 ${customer.displayName}` : `${customer.displayName} 선생님`;

  return (
    <div className="flex h-dvh flex-col">
      <StepHeader current={3} title="결제 비밀번호" onBack={() => setStep("identify")} onHome={onHome} />
      <div className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 gap-6 overflow-y-auto px-4 pb-6 md:grid-cols-2 md:items-center md:gap-10 md:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <LockKeyhole className="size-10 text-primary" />
          </span>
          <div>
            <p className="text-2xl font-bold">{who}님</p>
            <p className="mt-1 text-lg text-muted-foreground">MIRAEPASS 결제 비밀번호 6자리를 입력해 주세요</p>
          </div>
          <motion.div
            key={shake}
            animate={shake ? { x: [0, -14, 14, -10, 10, 0] } : undefined}
            transition={{ duration: 0.4 }}
            className="flex gap-3"
            aria-label={`${pin.length}자리 입력됨`}
          >
            {Array.from({ length: LENGTH }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-5 rounded-full transition-all md:size-6",
                  i < pin.length ? "scale-110 bg-primary" : "bg-slate-300",
                )}
              />
            ))}
          </motion.div>
          <div className="rounded-2xl bg-white px-6 py-3 text-lg shadow-sm">
            결제 금액 <span className="font-extrabold text-primary">{formatPoint(total)}</span>
          </div>
          <p className="text-sm text-muted-foreground">* 결제 비밀번호는 MIRAEPASS 앱에서 설정할 수 있어요 (준비 중)</p>
        </div>
        <NumericKeypad
          shuffle={shuffle}
          onDigit={(d) => setPin((v) => (v.length < LENGTH ? v + d : v))}
          onDelete={() => setPin((v) => v.slice(0, -1))}
          onClear={() => setPin("")}
        />
      </div>
    </div>
  );
}
