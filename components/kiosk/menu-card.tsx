"use client";

import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { formatPoint } from "@/lib/format";
import type { MenuItemDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MenuThumb } from "./menu-thumb";

export function MenuCard({ item, emoji, onSelect }: { item: MenuItemDTO; emoji: string; onSelect: () => void }) {
  const soldOut = item.isSoldOut;
  return (
    <button
      onClick={onSelect}
      disabled={soldOut}
      className="group relative h-full rounded-3xl text-left transition active:scale-[0.97] disabled:active:scale-100"
    >
      <MagicCard
        className="h-full rounded-3xl shadow-sm"
        gradientColor="oklch(0.932 0.032 255.585)"
        gradientFrom="oklch(0.707 0.165 254.624)"
        gradientTo="oklch(0.546 0.245 262.881)"
      >
        <div className={cn("flex h-full flex-col", soldOut && "opacity-45 grayscale")}>
          <MenuThumb imageUrl={item.imageUrl} emoji={emoji} name={item.name} className="aspect-[4/3] w-full rounded-t-3xl" />
          <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
            <p className="line-clamp-2 text-lg leading-snug font-bold md:text-xl">{item.name}</p>
            <p className="mt-auto text-lg font-bold text-primary md:text-xl">{formatPoint(item.price)}</p>
          </div>
        </div>
      </MagicCard>
      {item.badge && !soldOut && (
        <>
          <span
            className={cn(
              "absolute top-3 left-3 z-50 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow",
              item.badge === "BEST" ? "bg-primary" : "bg-amber-500",
            )}
          >
            {item.badge}
          </span>
          {item.badge === "BEST" && (
            <BorderBeam size={90} duration={7} colorFrom="#60a5fa" colorTo="#2563eb" borderWidth={2} className="z-50" />
          )}
        </>
      )}
      {soldOut && (
        <span className="absolute inset-0 z-50 flex items-center justify-center">
          <span className="rounded-full bg-slate-900/80 px-5 py-2 text-lg font-bold text-white">품절</span>
        </span>
      )}
    </button>
  );
}
