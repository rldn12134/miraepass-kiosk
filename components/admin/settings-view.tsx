"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings } from "@/hooks/queries";
import { api, ClientApiError } from "@/lib/fetcher";
import { fillTemplate } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { announce, unlockAudio } from "@/lib/speech";
import { WEEKDAY_KO } from "@/lib/store-hours";
import type { AppSettings, StoreHours } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const settings = useAdminSettings();
  if (!settings.data) return <Skeleton className="h-96" />;
  return <SettingsForm initial={settings.data.settings} kioskToken={settings.data.kioskToken} />;
}

function SettingsForm({ initial, kioskToken }: { initial: AppSettings; kioskToken: string }) {
  const qc = useQueryClient();
  const [s, setS] = useState(initial);

  const save = useMutation({
    mutationFn: (patch: Partial<AppSettings>) => api<{ settings: AppSettings }>("/api/admin/settings", { method: "PUT", body: patch }),
    onSuccess: ({ settings }) => {
      toast.success("저장했어요");
      setS(settings);
      qc.invalidateQueries({ queryKey: qk.adminSettings });
      qc.invalidateQueries({ queryKey: qk.storeStatus });
      qc.invalidateQueries({ queryKey: qk.publicSettings });
    },
    onError: (e) => {
      const issues = e instanceof ClientApiError ? (e.extra.issues as { message: string }[] | undefined) : undefined;
      toast.error(issues?.[0]?.message ?? (e instanceof ClientApiError ? e.message : "저장에 실패했어요"));
    },
  });

  const setDay = (day: keyof StoreHours, patch: Partial<StoreHours[keyof StoreHours]>) =>
    setS((p) => ({ ...p, storeHours: { ...p.storeHours, [day]: { ...p.storeHours[day], ...patch } } }));

  const preview = (text: string) => {
    unlockAudio();
    announce(text, { rate: s.voice.rate });
  };

  const saveButton = (patch: Partial<AppSettings>) => (
    <Button size="lg" disabled={save.isPending} onClick={() => save.mutate(patch)}>
      {save.isPending && <Loader2 className="animate-spin" />}
      저장
    </Button>
  );

  // 월~일 순서로 표시
  const days: (keyof StoreHours)[] = ["1", "2", "3", "4", "5", "6", "0"];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>영업시간</CardTitle>
          <CardDescription>영업시간 밖에는 키오스크가 &lsquo;주문 받지 않음&rsquo; 화면으로 바뀌어요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.map((d) => {
            const h = s.storeHours[d];
            return (
              <div key={d} className={cn("flex items-center gap-3 rounded-xl p-2", h.closed && "bg-slate-50")}>
                <span className={cn("w-8 text-center font-bold", d === "0" && "text-red-500", d === "6" && "text-blue-500")}>{WEEKDAY_KO[Number(d)]}</span>
                <Input type="time" value={h.open} disabled={h.closed} onChange={(e) => setDay(d, { open: e.target.value })} className="w-32" />
                <span className="text-muted-foreground">~</span>
                <Input type="time" value={h.close} disabled={h.closed} onChange={(e) => setDay(d, { close: e.target.value })} className="w-32" />
                <label className="ml-auto flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">휴무</span>
                  <Switch checked={h.closed} onCheckedChange={(v) => setDay(d, { closed: v })} />
                </label>
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="justify-end">
          {saveButton({ storeHours: s.storeHours })}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>지금 주문 받기</CardTitle>
          <CardDescription>영업시간과 상관없이 바로 주문을 막거나 다시 열어요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
            <span className="font-semibold">{s.manualClosed.closed ? "주문 중지됨" : "주문 받는 중"}</span>
            <Switch
              checked={!s.manualClosed.closed}
              onCheckedChange={(v) => {
                const manualClosed = { ...s.manualClosed, closed: !v };
                setS({ ...s, manualClosed });
                save.mutate({ manualClosed });
              }}
            />
          </label>
          <div className="space-y-1.5">
            <Label>중지 안내 문구</Label>
            <div className="flex gap-2">
              <Input
                value={s.manualClosed.message}
                maxLength={60}
                placeholder="예) 재료 준비 중이에요. 10분 뒤에 다시 와 주세요"
                onChange={(e) => setS({ ...s, manualClosed: { ...s.manualClosed, message: e.target.value } })}
              />
              <Button variant="outline" onClick={() => save.mutate({ manualClosed: s.manualClosed })}>
                저장
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>키오스크</CardTitle>
          <CardDescription>키오스크 기기 등록과 동작 시간을 설정해요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>기기 토큰</Label>
            <div className="flex gap-2">
              <Input readOnly value={kioskToken} className="font-mono" />
              <Button
                variant="outline"
                size="icon-lg"
                onClick={() => navigator.clipboard?.writeText(kioskToken).then(() => toast.success("복사했어요"))}
                aria-label="복사"
              >
                <Copy />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">키오스크 기기에서 /kiosk를 처음 열면 이 토큰을 입력해요. 바꾸려면 서버의 KIOSK_DEVICE_TOKEN을 수정하세요.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>대기화면 전환 (초)</Label>
              <Input
                type="number"
                min={15}
                max={600}
                value={s.kiosk.idleSeconds}
                onChange={(e) => setS({ ...s, kiosk: { ...s.kiosk, idleSeconds: Number(e.target.value) || 60 } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>완료 화면 유지 (초)</Label>
              <Input
                type="number"
                min={3}
                max={60}
                value={s.kiosk.doneSeconds}
                onChange={(e) => setS({ ...s, kiosk: { ...s.kiosk, doneSeconds: Number(e.target.value) || 10 } })}
              />
            </div>
          </div>
          <label className="flex items-center justify-between">
            <span>
              <span className="block text-sm font-semibold">결제 비밀번호 키패드 섞기</span>
              <span className="block text-xs text-muted-foreground">어깨 너머로 비밀번호가 보이지 않게 숫자 배열을 무작위로 바꿔요</span>
            </span>
            <Switch checked={s.kiosk.shufflePinPad} onCheckedChange={(v) => setS({ ...s, kiosk: { ...s.kiosk, shufflePinPad: v } })} />
          </label>
        </CardContent>
        <CardFooter className="justify-end">
          {saveButton({ kiosk: s.kiosk })}
        </CardFooter>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>음성 호출</CardTitle>
          <CardDescription>
            직원 기기에서 재생돼요. 사용할 수 있는 값: <code>{"{name}"}</code> 이름, <code>{"{grade}"}</code> 학년, <code>{"{orderNo}"}</code> 주문번호,{" "}
            <code>{"{menu}"}</code> 대표 메뉴
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["newOrder", "새 주문 알림", { orderNo: 12 }],
              ["callStudent", "학생 호출", { name: "홍길동", grade: 3, orderNo: 12, menu: "아메리카노 외 1개" }],
              ["callTeacher", "선생님 호출", { name: "김선생", orderNo: 12, menu: "카페라떼" }],
            ] as const
          ).map(([key, label, vars]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <div className="flex gap-2">
                <Input value={s.voice[key]} maxLength={100} onChange={(e) => setS({ ...s, voice: { ...s.voice, [key]: e.target.value } })} />
                <Button variant="outline" onClick={() => preview(fillTemplate(s.voice[key], vars))}>
                  <Play /> 미리듣기
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">→ {fillTemplate(s.voice[key], vars)}</p>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <Label className="shrink-0">말하기 속도</Label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={s.voice.rate}
              onChange={(e) => setS({ ...s, voice: { ...s.voice, rate: Number(e.target.value) } })}
              className="w-48 accent-primary"
            />
            <span className="text-sm tabular-nums">{s.voice.rate.toFixed(1)}x</span>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          {saveButton({ voice: s.voice })}
        </CardFooter>
      </Card>
    </div>
  );
}
