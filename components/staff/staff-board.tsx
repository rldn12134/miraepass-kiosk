"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PackageX,
  Settings2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatedListItem } from "@/components/ui/animated-list";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMe, usePublicSettings, useStoreStatus } from "@/hooks/queries";
import { useNow } from "@/hooks/use-now";
import { useSocket } from "@/hooks/use-socket";
import { api, ClientApiError } from "@/lib/fetcher";
import { customerLabel, fillTemplate, formatPoint, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { announce, hasKoreanVoice, speechSupported, unlockAudio } from "@/lib/speech";
import type { OrderCallPayload, OrderDTO, OrderStatus, VoiceSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { freshOrderIdsAtom, soundUnlockedAtom, staffPrefsAtom } from "@/store/staff";
import { CancelDialog } from "./cancel-dialog";
import { OrderCard, type CardAction } from "./order-card";
import { SoldOutDrawer } from "./sold-out-drawer";

type ActiveData = { active: OrderDTO[]; closedToday: OrderDTO[] };

const COLUMNS: { status: OrderStatus; title: string; tone: string }[] = [
  { status: "received", title: "접수 대기", tone: "bg-blue-600" },
  { status: "preparing", title: "제조 중", tone: "bg-amber-500" },
  { status: "ready", title: "픽업 대기", tone: "bg-emerald-600" },
];

const DEFAULT_VOICE: VoiceSettings = {
  newOrder: "주문이 들어왔어요.",
  callStudent: "{grade}학년 {name}님, 주문하신 음료가 나왔습니다.",
  callTeacher: "{name} 선생님, 주문하신 음료가 나왔습니다.",
  rate: 1,
};

/** 활성/완료 목록 캐시에 주문 하나를 반영 */
function upsert(data: ActiveData | undefined, order: OrderDTO): ActiveData | undefined {
  if (!data) return data;
  const isActive = ["received", "preparing", "ready"].includes(order.status);
  const active = data.active.filter((o) => o.id !== order.id);
  const closedToday = data.closedToday.filter((o) => o.id !== order.id);
  if (isActive) active.push(order);
  else if (order.status === "completed" || order.status === "cancelled") closedToday.unshift(order);
  active.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { active, closedToday };
}

export function callText(voice: VoiceSettings, p: OrderCallPayload) {
  const tpl = p.customerType === "teacher" ? voice.callTeacher : voice.callStudent;
  return fillTemplate(tpl, { name: p.customerName, grade: p.grade, orderNo: p.orderNo, menu: p.menu });
}

export function StaffBoard() {
  const qc = useQueryClient();
  const me = useMe();
  const status = useStoreStatus();
  const settings = usePublicSettings();
  const prefs = useAtomValue(staffPrefsAtom);
  const [unlocked, setUnlocked] = useAtom(soundUnlockedAtom);
  const [fresh, setFresh] = useAtom(freshOrderIdsAtom);
  const [tab, setTab] = useState<OrderStatus>("received");
  const [cancelTarget, setCancelTarget] = useState<OrderDTO | null>(null);
  const [soldOutOpen, setSoldOutOpen] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const now = useNow(15_000);

  const voice = settings.data?.voice ?? DEFAULT_VOICE;

  const orders = useQuery({
    queryKey: qk.activeOrders,
    queryFn: () => api<ActiveData>("/api/orders/active"),
    refetchInterval: 60_000,
  });

  const speak = useCallback(
    (text: string, enabled: boolean) => {
      if (!unlocked || !enabled) return;
      announce(text, { rate: voice.rate, chime: prefs.chime });
    },
    [unlocked, voice.rate, prefs.chime],
  );

  const connected = useSocket(
    { role: "staff" },
    {
      "order:new": (order) => {
        qc.setQueryData<ActiveData>(qk.activeOrders, (d) => upsert(d, order));
        setFresh((s) => new Set(s).add(order.id));
        speak(fillTemplate(voice.newOrder, { orderNo: order.orderNo }), prefs.announceNewOrder);
        toast.info(`새 주문 #${order.orderNo} · ${customerLabel(order)}`);
      },
      "order:updated": (order) => qc.setQueryData<ActiveData>(qk.activeOrders, (d) => upsert(d, order)),
      "order:call": (p) => speak(callText(voice, p), prefs.announceCall),
      "menu:changed": () => qc.invalidateQueries({ queryKey: qk.adminMenu }),
      "store:changed": (s) => qc.setQueryData(qk.storeStatus, s),
      "settings:changed": () => qc.invalidateQueries({ queryKey: qk.publicSettings }),
    },
    () => qc.invalidateQueries({ queryKey: qk.activeOrders }),
  );

  const [busyId, setBusyId] = useState<number | null>(null);
  const act = useMutation({
    mutationFn: async ({ order, action, reason }: { order: OrderDTO; action: CardAction; reason?: string }) => {
      setBusyId(order.id);
      if (action === "recall") return { order: await api<OrderDTO>(`/api/orders/${order.id}/recall`, { method: "POST" }) };
      return api<{ order: OrderDTO; refundError?: string }>(`/api/orders/${order.id}`, {
        method: "PATCH",
        body: { action, reason },
      });
    },
    onSuccess: ({ order, refundError }: { order: OrderDTO; refundError?: string }, { action }) => {
      qc.setQueryData<ActiveData>(qk.activeOrders, (d) => upsert(d, order));
      if (action === "cancel") {
        if (refundError) toast.error(`#${order.orderNo} 취소됨 · 환불 실패: ${refundError}`, { duration: 10_000 });
        else toast.success(`#${order.orderNo} 취소 및 ${formatPoint(order.total)} 환불 완료`);
      }
    },
    onError: (e) => {
      toast.error(e instanceof ClientApiError ? e.message : "처리에 실패했어요");
      qc.invalidateQueries({ queryKey: qk.activeOrders });
    },
    onSettled: () => setBusyId(null),
  });

  const handleAction = (order: OrderDTO, action: CardAction) => {
    setFresh((s) => {
      const n = new Set(s);
      n.delete(order.id);
      return n;
    });
    if (action === "cancel") return setCancelTarget(order);
    act.mutate({ order, action });
  };

  const grouped = useMemo(() => {
    const g: Record<string, OrderDTO[]> = { received: [], preparing: [], ready: [] };
    orders.data?.active.forEach((o) => g[o.status]?.push(o));
    return g;
  }, [orders.data]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    window.location.replace("/staff/login");
  };

  const isAdmin = me.data?.role === "admin";

  return (
    <div className="flex h-dvh flex-col">
      {/* 상단 바 */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-3 py-2 md:gap-3 md:px-5">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-7" />
          <span className="text-lg font-extrabold">주문 처리</span>
        </div>
        <StoreBadge open={status.data?.open} message={status.data?.message} isAdmin={isAdmin} />
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
            connected ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600",
          )}
          title={connected ? "실시간 연결됨" : "연결 끊김 · 재연결 중"}
        >
          {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
          <span className="hidden sm:inline">{connected ? "실시간" : "재연결 중"}</span>
        </span>
        <Clock now={now} />
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="lg" onClick={() => setSoldOutOpen(true)}>
            <PackageX /> <span className="hidden sm:inline">품절 관리</span>
          </Button>
          <SoundSettings />
          {isAdmin && (
            <Button variant="outline" size="icon-lg" asChild aria-label="관리자">
              <Link href="/admin">
                <LayoutDashboard />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon-lg" onClick={logout} aria-label="로그아웃">
            <LogOut />
          </Button>
        </div>
      </header>

      {/* 소리 켜기 배너 (자동재생 정책) */}
      {!unlocked && (
        <button
          onClick={() => {
            unlockAudio();
            setUnlocked(true);
            if (speechSupported() && !hasKoreanVoice()) toast.warning("이 기기에 한국어 음성이 없어요. 알림음만 재생돼요.");
          }}
          className="flex shrink-0 items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-bold text-primary-foreground"
        >
          <Volume2 className="size-5 animate-pulse" />
          여기를 눌러 음성 알림을 켜 주세요
        </button>
      )}

      {/* 모바일: 탭 */}
      <div className="shrink-0 px-3 pt-3 md:hidden">
        <Tabs value={tab} onValueChange={(v) => setTab(v as OrderStatus)}>
          <TabsList className="grid h-11 w-full grid-cols-3">
            {COLUMNS.map((c) => (
              <TabsTrigger key={c.status} value={c.status} className="text-sm font-bold">
                {c.title} {grouped[c.status].length}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* 칸반 */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-3 md:p-4">
        {COLUMNS.map((col) => (
          <section
            key={col.status}
            className={cn("flex min-h-0 flex-col rounded-2xl bg-slate-200/60", tab !== col.status && "hidden md:flex")}
          >
            <h2 className="flex shrink-0 items-center gap-2 px-4 py-3 text-lg font-extrabold">
              <span className={cn("size-2.5 rounded-full", col.tone)} />
              {col.title}
              <span className="ml-auto rounded-full bg-white px-2.5 text-base tabular-nums">{grouped[col.status].length}</span>
            </h2>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
              {orders.isPending && <p className="py-10 text-center text-muted-foreground">불러오는 중…</p>}
              {!orders.isPending && grouped[col.status].length === 0 && (
                <p className="py-10 text-center text-muted-foreground">주문이 없어요</p>
              )}
              <AnimatePresence initial={false}>
                {grouped[col.status].map((o) => (
                  <AnimatedListItem key={o.id}>
                    <OrderCard
                      order={o}
                      now={now}
                      fresh={fresh.has(o.id)}
                      busy={busyId === o.id}
                      onAction={(a) => handleAction(o, a)}
                      onSeen={() =>
                        setFresh((s) => {
                          const n = new Set(s);
                          n.delete(o.id);
                          return n;
                        })
                      }
                    />
                  </AnimatedListItem>
                ))}
              </AnimatePresence>
            </div>
          </section>
        ))}
      </main>

      {/* 오늘 처리 완료 */}
      <footer className="shrink-0 border-t bg-white">
        <button
          onClick={() => setShowClosed((v) => !v)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-foreground"
        >
          오늘 완료·취소 {orders.data?.closedToday.length ?? 0}건
          <ChevronDown className={cn("size-4 transition", showClosed && "rotate-180")} />
        </button>
        {showClosed && (
          <ul className="max-h-48 divide-y overflow-y-auto px-4 pb-2 text-sm">
            {orders.data?.closedToday.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2">
                <span className="w-12 font-bold tabular-nums">#{o.orderNo}</span>
                <span className="flex-1 truncate">{customerLabel(o)}</span>
                <span className={cn("font-semibold", o.status === "cancelled" ? "text-destructive" : "text-emerald-600")}>
                  {STATUS_LABEL[o.status]}
                </span>
                {o.status === "cancelled" && (
                  <span className={cn(o.paymentStatus === "refund_failed" && "font-bold text-destructive")}>
                    {PAYMENT_LABEL[o.paymentStatus]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </footer>

      <CancelDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => {
          if (cancelTarget) act.mutate({ order: cancelTarget, action: "cancel", reason });
          setCancelTarget(null);
        }}
      />
      <SoldOutDrawer open={soldOutOpen} onOpenChange={setSoldOutOpen} />
    </div>
  );
}

function Clock({ now }: { now: number }) {
  return (
    <span className="hidden text-sm font-semibold text-muted-foreground tabular-nums sm:inline">
      {new Date(now).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function StoreBadge({ open, message, isAdmin }: { open?: boolean; message?: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: (closed: boolean) =>
      api("/api/admin/settings", {
        method: "PUT",
        body: { manualClosed: { closed, message: closed ? "잠시 주문을 받지 않아요" : "" } },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.storeStatus });
      qc.invalidateQueries({ queryKey: qk.adminSettings });
    },
    onError: (e) => toast.error(e instanceof ClientApiError ? e.message : "변경에 실패했어요"),
  });
  const badge = (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
        open ? "bg-blue-50 text-primary" : "bg-slate-100 text-slate-500",
      )}
    >
      <span className={cn("size-2 rounded-full", open ? "animate-pulse bg-primary" : "bg-slate-400")} />
      {open ? "영업 중" : (message ?? "영업 종료")}
    </span>
  );
  if (!isAdmin) return badge;
  return (
    <Popover>
      <PopoverTrigger>{badge}</PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="font-bold">주문 받기</p>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">끄면 키오스크에서 바로 주문을 막아요 (영업시간과 별개)</span>
          <Switch checked={!!open} disabled={toggle.isPending} onCheckedChange={(v) => toggle.mutate(!v)} />
        </label>
      </PopoverContent>
    </Popover>
  );
}

function SoundSettings() {
  const [prefs, setPrefs] = useAtom(staffPrefsAtom);
  const unlocked = useAtomValue(soundUnlockedAtom);
  const settings = usePublicSettings();
  const setUnlocked = useSetAtom(soundUnlockedAtom);
  const voice = settings.data?.voice ?? DEFAULT_VOICE;
  const anyOn = prefs.announceNewOrder || prefs.announceCall;

  const test = () => {
    if (!unlocked) {
      unlockAudio();
      setUnlocked(true);
    }
    announce(fillTemplate(voice.callStudent, { grade: 3, name: "홍길동" }), { rate: voice.rate, chime: prefs.chime });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-lg" aria-label="음성 설정">
          {anyOn && unlocked ? <Volume2 /> : <VolumeX />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-center gap-2 font-bold">
          <Settings2 className="size-4" /> 이 기기의 음성 알림
        </div>
        {(
          [
            ["announceNewOrder", "새 주문 알림", `"${voice.newOrder}"`],
            ["announceCall", "픽업 호출", "제조 완료·재호출 시 고객 이름 호출"],
            ["chime", "알림음", "음성 전에 띵동 소리"],
          ] as const
        ).map(([key, label, desc]) => (
          <label key={key} className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
            <Switch checked={prefs[key]} onCheckedChange={(v) => setPrefs({ ...prefs, [key]: v })} />
          </label>
        ))}
        <p className="text-xs text-muted-foreground">카운터 스피커에 연결된 기기에서만 픽업 호출을 켜 두세요.</p>
        <Button variant="secondary" className="w-full" onClick={test}>
          <Volume2 /> 음성 테스트
        </Button>
      </PopoverContent>
    </Popover>
  );
}
