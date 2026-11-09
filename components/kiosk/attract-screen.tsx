"use client";

import { Hand } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Marquee } from "@/components/ui/marquee";
import { WordRotate } from "@/components/ui/word-rotate";
import { formatPoint } from "@/lib/format";
import type { CategoryDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MenuThumb } from "./menu-thumb";

/** 대기화면: 입력이 없을 때 표시. 아무 곳이나 터치하면 주문 시작 */
export function AttractScreen({ menu, onStart }: { menu: CategoryDTO[]; onStart: () => void }) {
  const items = menu.flatMap((c) => c.items.map((i) => ({ ...i, emoji: c.emoji })));
  const featured = items.filter((i) => i.badge).concat(items.filter((i) => !i.badge)).slice(0, 10);
  const words = featured.length ? featured.slice(0, 5).map((i) => i.name) : ["아메리카노", "카페라떼", "에이드"];

  return (
    <button
      onClick={onStart}
      className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-blue-50 to-slate-100 text-center"
    >
      <DotPattern
        glow
        className={cn("text-blue-300/60 [mask-image:radial-gradient(60vmin_circle_at_center,white,transparent)]")}
      />
      <div className="relative z-10 flex flex-col items-center gap-6 px-6">
        <img src="/favicon.svg" alt="" className="h-14 md:h-20" />
        <p className="text-lg font-semibold text-primary md:text-2xl">순천미래과학고 교내 카페</p>
        <div className="flex flex-col items-center text-[2.5rem] leading-tight font-extrabold tracking-tight md:text-h1 md:font-extrabold">
          <span>오늘은</span>
          <WordRotate words={words} duration={2200} className="text-primary" />
          <span>어떠세요?</span>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-full bg-white/80 px-8 py-4 shadow-lg ring-1 ring-blue-100 backdrop-blur">
          <Hand className="size-7 animate-bounce text-primary" />
          <AnimatedShinyText className="text-xl font-bold md:text-2xl">화면을 터치해 주문하세요</AnimatedShinyText>
        </div>
        <p className="text-sm text-muted-foreground md:text-base">MIRAEPASS 포인트로 결제할 수 있어요</p>
      </div>

      {featured.length > 0 && (
        <div className="absolute inset-x-0 bottom-6 z-10 md:bottom-10">
          <Marquee pauseOnHover className="[--duration:35s] [--gap:1rem]">
            {featured.map((i) => (
              <div key={i.id} className="flex w-52 items-center gap-3 rounded-2xl bg-white/90 p-2 pr-4 shadow-sm">
                <MenuThumb imageUrl={i.imageUrl} emoji={i.emoji} name={i.name} className="size-14 shrink-0 rounded-xl [&_span]:text-3xl" />
                <div className="min-w-0 text-left">
                  <p className="truncate font-semibold">{i.name}</p>
                  <p className="text-sm text-primary">{formatPoint(i.price)}</p>
                </div>
              </div>
            ))}
          </Marquee>
        </div>
      )}
    </button>
  );
}
