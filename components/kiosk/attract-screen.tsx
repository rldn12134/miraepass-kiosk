"use client";

import { Hand } from "lucide-react";
import { memo, useMemo } from "react";
import { Marquee } from "@/components/ui/marquee";
import { WordRotate } from "@/components/ui/word-rotate";
import { formatPoint } from "@/lib/format";
import type { CategoryDTO } from "@/lib/types";
import { MenuThumb } from "./menu-thumb";

/**
 * 대기화면: 입력이 없을 때 표시. 아무 곳이나 터치하면 주문 시작.
 *
 * 성능 메모 (태블릿에서 하루 종일 켜져 있는 화면):
 * - 배경 점무늬는 SVG 요소 수천 개 + JS 애니메이션(DotPattern glow) 대신 CSS 그라디언트 한 장으로 그린다.
 * - 계속 움직이는 요소는 transform/opacity만 애니메이션해서 GPU 합성만 일어나게 한다
 *   (backdrop-blur, background-position 애니메이션처럼 매 프레임 repaint를 일으키는 효과는 쓰지 않는다).
 */
export const AttractScreen = memo(function AttractScreen({ menu, onStart }: { menu: CategoryDTO[]; onStart: () => void }) {
  const { featured, words } = useMemo(() => {
    const items = menu.flatMap((c) => c.items.map((i) => ({ ...i, emoji: c.emoji })));
    const featured = items.filter((i) => i.badge).concat(items.filter((i) => !i.badge)).slice(0, 10);
    const words = featured.length ? featured.slice(0, 5).map((i) => i.name) : ["아메리카노", "카페라떼", "에이드"];
    return { featured, words };
  }, [menu]);

  return (
    <button
      onClick={onStart}
      className="relative isolate flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-blue-50 to-slate-100 text-center"
    >
      {/* 정적 점무늬 배경: DOM 노드 1개, 애니메이션 없음 */}
      <div aria-hidden className="attract-dots pointer-events-none absolute inset-0 -z-10" />

      <div className="flex flex-col items-center gap-6 px-6">
        <img src="/favicon.svg" alt="" className="h-14 md:h-20" />
        <p className="text-lg font-semibold text-primary md:text-2xl">순천미래과학고 교내 카페</p>
        <div className="flex flex-col items-center text-[2.5rem] leading-tight font-extrabold tracking-tight md:text-h1 md:font-extrabold">
          <span>오늘은</span>
          <WordRotate words={words} duration={2600} className="text-primary" />
          <span>어떠세요?</span>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-full bg-white px-8 py-4 shadow-lg ring-1 ring-blue-100">
          <Hand className="size-7 animate-bounce text-primary" />
          <span className="attract-pulse text-xl font-bold text-slate-700 md:text-2xl">화면을 터치해 주문하세요</span>
        </div>
        <p className="text-sm text-muted-foreground md:text-base">MIRAEPASS 포인트로 결제할 수 있어요</p>
      </div>

      {featured.length > 0 && (
        <div className="absolute inset-x-0 bottom-6 md:bottom-10">
          {/* 화면을 채우는 데 필요한 2벌만 복제 (기본 4벌) */}
          <Marquee repeat={2} className="[--duration:40s] [--gap:1rem] [&>div]:will-change-transform">
            {featured.map((i) => (
              <div key={i.id} className="flex w-52 items-center gap-3 rounded-2xl bg-white p-2 pr-4 shadow-sm">
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
});
