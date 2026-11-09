import { cn } from "@/lib/utils";

/** 메뉴 이미지가 없으면 카테고리 이모지(Tossface)로 대체 */
export function MenuThumb({
  imageUrl,
  emoji,
  name,
  className,
}: {
  imageUrl: string | null;
  emoji: string;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100",
        className,
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="size-full object-cover" draggable={false} />
      ) : (
        <span className="tossface text-[clamp(2.5rem,6vw,4rem)] leading-none" aria-hidden>
          {emoji}
        </span>
      )}
    </div>
  );
}
