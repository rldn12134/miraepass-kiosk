"use client";

import { useSetAtom } from "jotai";
import { MonitorSmartphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ClientApiError, KIOSK_TOKEN_KEY } from "@/lib/fetcher";
import { kioskTokenAtom } from "@/store/kiosk";

/** 키오스크 기기 최초 등록: 관리자 설정 화면의 기기 토큰을 입력 */
export function KioskSetup() {
  const setToken = useSetAtom(kioskTokenAtom);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      localStorage.setItem(KIOSK_TOKEN_KEY, value.trim());
      await api("/api/kiosk/verify", { method: "POST", kiosk: true });
      setToken(value.trim());
    } catch (err) {
      localStorage.removeItem(KIOSK_TOKEN_KEY);
      setError(err instanceof ClientApiError ? err.message : "확인에 실패했어요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-6 rounded-3xl bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <MonitorSmartphone className="size-12 text-primary" />
          <h1 className="text-2xl font-bold">키오스크 기기 등록</h1>
          <p className="text-muted-foreground">관리자 › 설정 화면의 키오스크 기기 토큰을 입력해 주세요.</p>
        </div>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="기기 토큰"
          className="h-14 text-lg"
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-14 w-full text-lg" disabled={!value.trim() || loading}>
          {loading ? "확인 중…" : "등록하기"}
        </Button>
      </form>
    </div>
  );
}
