"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ClientApiError } from "@/lib/fetcher";
import { qk } from "@/lib/query-keys";
import type { SessionUser } from "@/lib/types";

export function LoginForm({ target }: { target: "staff" | "admin" }) {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => api<SessionUser>("/api/auth/login", { method: "POST", body: { id: Number(id), password } }),
    onSuccess: (user) => {
      qc.setQueryData(qk.me, user);
      if (target === "admin" && user.role !== "admin") {
        router.replace("/staff");
        return;
      }
      router.replace(target === "admin" ? "/admin" : "/staff");
      router.refresh();
    },
  });

  const error =
    login.error instanceof ClientApiError
      ? login.error.message
      : login.error
        ? "로그인에 실패했어요"
        : params.get("denied")
          ? "관리자 권한이 필요한 화면이에요"
          : null;

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate();
        }}
        className="w-full max-w-sm space-y-6 rounded-3xl bg-white p-8 shadow-sm"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/favicon.svg" alt="" className="h-12" />
          <div>
            <h1 className="text-2xl font-bold">{target === "admin" ? "카페 관리자" : "카페 직원"} 로그인</h1>
            <p className="mt-1 text-sm text-muted-foreground">MIRAEPASS 계정으로 로그인해 주세요</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mp-id">MIRAEPASS ID</Label>
            <Input
              id="mp-id"
              inputMode="numeric"
              autoComplete="username"
              value={id}
              onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
              className="h-12 text-base"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mp-pw">비밀번호</Label>
            <Input
              id="mp-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-base"
            />
          </div>
        </div>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}
        <Button type="submit" className="h-12 w-full text-base" disabled={!id || !password || login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />}
          로그인
        </Button>
        <p className="text-center text-xs text-muted-foreground">MIRAEPASS 비밀번호는 카페 서버에 저장되지 않아요</p>
      </form>
    </div>
  );
}
