"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { CircleAlert } from "lucide-react";
import { idempotencyKeyAtom, kioskErrorAtom, newIdempotencyKey, stepAtom } from "@/store/kiosk";

const TITLES: Record<string, string> = {
  INSUFFICIENT_POINT: "포인트가 부족해요",
  USER_NOT_FOUND: "사용자를 찾을 수 없어요",
  STORE_CLOSED: "지금은 주문할 수 없어요",
  ITEM_SOLD_OUT: "품절된 메뉴가 있어요",
  ITEM_UNAVAILABLE: "판매하지 않는 메뉴가 있어요",
  INVALID_OPTIONS: "옵션이 변경됐어요",
  PRICE_CHANGED: "가격이 변경됐어요",
  PAYMENT_UNAVAILABLE: "결제 서버에 연결할 수 없어요",
  PIN_NOT_SET: "키오스크 비밀번호가 없어요",
  PIN_LOCKED: "잠시 결제할 수 없어요",
};

/** 다른 사람(ID)으로 다시 결제해야 하는 오류 */
const BACK_TO_IDENTIFY = new Set(["INSUFFICIENT_POINT", "USER_NOT_FOUND", "PIN_NOT_SET", "PIN_LOCKED"]);

/** 오류 코드별 다음 행동: 장바구니 수정이 필요한 오류는 주문 확인 화면으로 */
const BACK_TO_REVIEW = new Set(["ITEM_SOLD_OUT", "ITEM_UNAVAILABLE", "INVALID_OPTIONS", "PRICE_CHANGED"]);

export function ErrorScreen({ onHome }: { onHome: () => void }) {
  const error = useAtomValue(kioskErrorAtom);
  const setStep = useSetAtom(stepAtom);
  const setKey = useSetAtom(idempotencyKeyAtom);
  if (!error) return null;

  const retry = () => {
    if (BACK_TO_REVIEW.has(error.code)) return setStep("review");
    if (BACK_TO_IDENTIFY.has(error.code)) return setStep("identify");
    // 새 결제 시도: 멱등키를 새로 발급하고, 비밀번호는 이미 지웠으므로 다시 입력받는다
    setKey(newIdempotencyKey());
    setStep("pin");
  };
  const retryLabel = BACK_TO_REVIEW.has(error.code)
    ? "주문 내역 수정"
    : BACK_TO_IDENTIFY.has(error.code)
      ? "다른 ID로 결제"
      : "다시 시도";

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <CircleAlert className="size-20 text-destructive" />
      <div className="space-y-2">
        <h1 className="text-h6 font-extrabold md:text-h5">{TITLES[error.code] ?? "결제에 실패했어요"}</h1>
        <p className="text-xl text-muted-foreground">{error.message}</p>
        {error.code === "INSUFFICIENT_POINT" && <p className="text-muted-foreground">결제되지 않았어요. 포인트를 확인해 주세요.</p>}
        {error.code === "PIN_NOT_SET" && <p className="text-muted-foreground">MIRAEPASS 앱에서 키오스크 비밀번호(숫자 6자리)를 먼저 설정해 주세요.</p>}
      </div>
      <div className="grid w-full max-w-lg grid-cols-2 gap-3">
        <button onClick={onHome} className="h-16 rounded-2xl bg-white text-xl font-semibold shadow-sm active:scale-[0.98]">
          처음으로
        </button>
        {error.code !== "STORE_CLOSED" && (
          <button onClick={retry} className="h-16 rounded-2xl bg-primary text-xl font-bold text-primary-foreground active:scale-[0.98]">
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
