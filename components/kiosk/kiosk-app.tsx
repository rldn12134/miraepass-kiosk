"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useMenu, usePublicSettings, useStoreStatus } from "@/hooks/queries";
import { useIdleTimer } from "@/hooks/use-idle-timer";
import { useSocket } from "@/hooks/use-socket";
import { qk } from "@/lib/query-keys";
import type { MenuItemDTO } from "@/lib/types";
import { kioskTokenAtom, paymentPendingAtom, resetKioskAtom, stepAtom, syncCartWithMenuAtom, type KioskStep } from "@/store/kiosk";
import { AttractScreen } from "./attract-screen";
import { ClosedScreen } from "./closed-screen";
import { DoneScreen } from "./done-screen";
import { ErrorScreen } from "./error-screen";
import { IdentifyScreen } from "./identify-screen";
import { KioskSetup } from "./kiosk-setup";
import { MenuScreen } from "./menu-screen";
import { PinScreen } from "./pin-screen";
import { ReviewScreen } from "./review-screen";

/** 입력 중인 단계: 이때만 무입력 타이머로 대기화면 복귀 */
const INTERACTIVE: KioskStep[] = ["menu", "review", "identify", "pin", "error"];
/** 결제 완료 화면은 영업 종료 화면으로 끊지 않는다 (결제 진행 중은 paymentPendingAtom으로 판단) */
const UNINTERRUPTIBLE: KioskStep[] = ["done"];

const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export function KioskApp() {
  const mounted = useMounted();
  const token = useAtomValue(kioskTokenAtom);
  if (!mounted) return <FullscreenLoader />;
  if (!token) return <KioskSetup />;
  return <KioskFlow token={token} />;
}

function KioskFlow({ token }: { token: string }) {
  const qc = useQueryClient();
  const [step, setStep] = useAtom(stepAtom);
  const reset = useSetAtom(resetKioskAtom);
  const syncCart = useSetAtom(syncCartWithMenuAtom);
  const paying = useAtomValue(paymentPendingAtom);
  const locked = paying || UNINTERRUPTIBLE.includes(step);
  const menu = useMenu();
  const status = useStoreStatus();
  const settings = usePublicSettings();

  useSocket(
    { role: "kiosk", kioskToken: token },
    {
      "menu:changed": () => qc.invalidateQueries({ queryKey: qk.menu }),
      "store:changed": (s) => qc.setQueryData(qk.storeStatus, s),
      "settings:changed": () => qc.invalidateQueries({ queryKey: qk.publicSettings }),
    },
    () => {
      qc.invalidateQueries({ queryKey: qk.menu });
      qc.invalidateQueries({ queryKey: qk.storeStatus });
    },
  );

  // 메뉴(가격·품절)가 바뀌면 장바구니를 최신 메뉴에 맞춘다
  const menuMap = useMemo(() => {
    const map = new Map<number, MenuItemDTO>();
    menu.data?.forEach((c) => c.items.forEach((i) => map.set(i.id, i)));
    return map;
  }, [menu.data]);
  useEffect(() => {
    if (menu.data && !locked) syncCart(menuMap);
    // step 변화로는 다시 맞출 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuMap, syncCart]);

  const kiosk = settings.data?.kiosk ?? { idleSeconds: 60, doneSeconds: 10, shufflePinPad: true };
  const goHome = useCallback(() => reset("attract"), [reset]);
  const finish = useCallback(() => reset("attract"), [reset]);

  useIdleTimer(kiosk.idleSeconds, goHome, INTERACTIVE.includes(step) && !paying);

  const closed = status.data && !status.data.open;
  useEffect(() => {
    if (closed && !locked && step !== "attract") reset("attract");
  }, [closed, locked, step, reset]);

  if (menu.isPending || status.isPending) return <FullscreenLoader />;
  if (menu.isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 text-center">
        <p className="text-2xl font-bold">메뉴를 불러오지 못했어요</p>
        <button onClick={() => menu.refetch()} className="h-14 rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground">
          다시 시도
        </button>
      </div>
    );
  }
  if (closed && !locked) return <ClosedScreen status={status.data!} />;

  return (
    <div className="kiosk-surface h-dvh overflow-hidden">
      {step === "attract" && <AttractScreen menu={menu.data} onStart={() => setStep("menu")} />}
      {step === "menu" && <MenuScreen menu={menu.data} onHome={goHome} />}
      {step === "review" && <ReviewScreen onHome={goHome} />}
      {step === "identify" && <IdentifyScreen onHome={goHome} />}
      {step === "pin" && <PinScreen shuffle={kiosk.shufflePinPad} onHome={goHome} />}
      {step === "done" && <DoneScreen seconds={kiosk.doneSeconds} onFinish={finish} />}
      {step === "error" && <ErrorScreen onHome={goHome} />}
    </div>
  );
}

function FullscreenLoader() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <Loader2 className="size-10 animate-spin text-primary" />
    </div>
  );
}
