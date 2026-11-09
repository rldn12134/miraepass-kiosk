"use client";

import confetti from "canvas-confetti";
import { useAtomValue } from "jotai";
import { CheckCircle2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatPoint } from "@/lib/format";
import { customerAtom, orderResultAtom } from "@/store/kiosk";

export function DoneScreen({ seconds, onFinish }: { seconds: number; onFinish: () => void }) {
  const result = useAtomValue(orderResultAtom);
  const customer = useAtomValue(customerAtom);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const colors = ["#2563eb", "#60a5fa", "#fbbf24", "#93c5fd"];
    const fire = (x: number) => confetti({ particleCount: 90, spread: 70, startVelocity: 45, origin: { x, y: 0.7 }, colors });
    fire(0.25);
    fire(0.75);
    const t = setTimeout(() => fire(0.5), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (left <= 0) return void onFinish();
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onFinish]);

  if (!result) return null;
  const callName =
    customer?.type === "teacher" ? `${customer.displayName} 선생님` : customer ? `${customer.grade}학년 ${customer.displayName}님` : "";

  return (
    <button onClick={onFinish} className="flex h-dvh w-full flex-col items-center justify-center gap-6 px-6 text-center">
      <BlurFade delay={0.05}>
        <CheckCircle2 className="size-20 text-success md:size-24" />
      </BlurFade>
      <BlurFade delay={0.15}>
        <h1 className="text-h6 font-extrabold md:text-h4">주문이 완료됐어요!</h1>
      </BlurFade>
      <BlurFade delay={0.25} className="flex flex-col items-center rounded-[2rem] bg-white px-14 py-6 shadow-sm">
        <span className="text-lg font-semibold text-muted-foreground">주문번호</span>
        <span className="text-[5.5rem] leading-none font-black text-primary tabular-nums md:text-[7rem]">
          <NumberTicker value={result.orderNo} />
        </span>
      </BlurFade>
      <BlurFade delay={0.35} className="space-y-2">
        <p className="flex items-center justify-center gap-2 text-xl font-semibold">
          <Volume2 className="size-6 text-primary" />
          음료가 준비되면 &ldquo;{callName}&rdquo;으로 불러드릴게요
        </p>
        <p className="text-lg text-muted-foreground">
          결제 {formatPoint(result.total)}
          {result.balanceAfter !== null && <> · 남은 포인트 {formatPoint(result.balanceAfter)}</>}
        </p>
      </BlurFade>
      <p className="mt-4 text-muted-foreground">{left}초 후 처음 화면으로 돌아가요 · 화면을 터치하면 바로 돌아가요</p>
    </button>
  );
}
