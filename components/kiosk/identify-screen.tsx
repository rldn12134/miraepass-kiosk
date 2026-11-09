"use client";

import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { AlertTriangle, GraduationCap, Loader2, School, UserRound } from "lucide-react";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/fetcher";
import type { CustomerCandidate, CustomerType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { cartTotalAtom, customerAtom, newIdempotencyKey, idempotencyKeyAtom, stepAtom } from "@/store/kiosk";
import { NumericKeypad } from "./numeric-keypad";
import { StepHeader } from "./step-header";

type Lookup = { type: "student"; studentId: string } | { type: "teacher"; name: string };

export function IdentifyScreen({ onHome }: { onHome: () => void }) {
  const setStep = useSetAtom(stepAtom);
  const setCustomer = useSetAtom(customerAtom);
  const setKey = useSetAtom(idempotencyKeyAtom);
  const total = useAtomValue(cartTotalAtom);
  const [type, setType] = useState<CustomerType>("student");
  const [studentId, setStudentId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [candidates, setCandidates] = useState<CustomerCandidate[] | null>(null);

  const lookup = useMutation({
    mutationFn: (q: Lookup) =>
      api<CustomerCandidate[]>("/api/customers/lookup", {
        method: "POST",
        kiosk: true,
        body: q.type === "student" ? { type: "student", studentId: Number(q.studentId), amount: total } : { type: "teacher", name: q.name, amount: total },
      }),
    onSuccess: (list) => setCandidates(list),
    onError: () => setCandidates(null),
  });

  const switchType = (t: CustomerType) => {
    setType(t);
    setCandidates(null);
    lookup.reset();
  };

  const confirm = (c: CustomerCandidate) => {
    setCustomer({ ...c, searchName: c.type === "teacher" ? c.displayName : undefined });
    setKey(newIdempotencyKey());
    setStep("pin");
  };

  const error = lookup.error instanceof ClientApiError ? lookup.error.message : lookup.error ? "조회에 실패했어요" : null;

  return (
    <div className="flex h-dvh flex-col">
      <StepHeader current={2} title="누가 주문하나요?" onBack={() => setStep("review")} onHome={onHome} />
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:px-8">
        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-2 shadow-sm">
          {(
            [
              ["student", "학생", GraduationCap],
              ["teacher", "선생님", School],
            ] as const
          ).map(([t, label, Icon]) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              className={cn(
                "flex h-16 items-center justify-center gap-2 rounded-2xl text-xl font-bold transition",
                type === t ? "bg-primary text-primary-foreground shadow" : "text-slate-500",
              )}
            >
              <Icon className="size-6" />
              {label}
            </button>
          ))}
        </div>

        {candidates ? (
          <CandidateList
            type={type}
            candidates={candidates}
            onPick={confirm}
            onRetry={() => setCandidates(null)}
          />
        ) : type === "student" ? (
          <div className="grid flex-1 gap-4 md:grid-cols-2 md:items-center md:gap-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-xl font-semibold">학번 5자리를 입력해 주세요</p>
              <p className="text-muted-foreground">예) 3학년 5반 12번 → 30512</p>
              <div className="mt-2 flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "flex size-14 items-center justify-center rounded-2xl bg-white text-3xl font-bold shadow-sm md:size-16",
                      i === studentId.length && "ring-2 ring-primary",
                    )}
                  >
                    {studentId[i] ?? ""}
                  </span>
                ))}
              </div>
              {error && <ErrorText text={error} />}
              <button
                disabled={studentId.length !== 5 || lookup.isPending}
                onClick={() => lookup.mutate({ type: "student", studentId })}
                className="mt-2 flex h-16 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
              >
                {lookup.isPending && <Loader2 className="size-6 animate-spin" />}
                확인
              </button>
            </div>
            <NumericKeypad
              onDigit={(d) => setStudentId((v) => (v.length < 5 ? v + d : v))}
              onDelete={() => setStudentId((v) => v.slice(0, -1))}
              onClear={() => setStudentId("")}
            />
          </div>
        ) : (
          <form
            className="flex flex-col items-center gap-4 pt-4 text-center"
            onSubmit={(e) => {
              e.preventDefault();
              if (teacherName.trim()) lookup.mutate({ type: "teacher", name: teacherName.trim() });
            }}
          >
            <p className="text-xl font-semibold">선생님 성함을 입력해 주세요</p>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="예) 홍길동"
              autoFocus
              maxLength={20}
              enterKeyHint="search"
              className="h-18 w-full max-w-md rounded-2xl border-0 bg-white px-6 text-center text-3xl font-bold shadow-sm ring-2 ring-transparent outline-none focus:ring-primary md:h-20"
            />
            {error && <ErrorText text={error} />}
            <button
              type="submit"
              disabled={!teacherName.trim() || lookup.isPending}
              className="flex h-16 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary text-xl font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-40"
            >
              {lookup.isPending && <Loader2 className="size-6 animate-spin" />}
              검색
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 font-semibold text-destructive">
      <AlertTriangle className="size-5" />
      {text}
    </p>
  );
}

function CandidateList({
  type,
  candidates,
  onPick,
  onRetry,
}: {
  type: CustomerType;
  candidates: CustomerCandidate[];
  onPick: (c: CustomerCandidate) => void;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 pt-2">
      <p className="text-center text-xl font-semibold">
        {type === "student" ? "본인이 맞는지 확인해 주세요" : "본인을 선택해 주세요"}
      </p>
      {candidates.map((c) => {
        const insufficient = c.sufficient === false;
        return (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            disabled={insufficient}
            className="flex items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-sm ring-2 ring-transparent transition active:scale-[0.98] active:ring-primary disabled:opacity-60"
          >
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserRound className="size-8" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-bold">
                {c.type === "student" ? `${c.grade}학년 ${c.displayName}` : `${c.displayName} 선생님`}
              </span>
              <span className="block text-muted-foreground">
                {c.type === "student" ? `학번 ${c.id}` : `MIRAEPASS ID ${String(c.id).replace(/\d(?=\d{2})/g, "*")}`}
              </span>
              {insufficient && <span className="mt-1 block font-semibold text-destructive">포인트가 부족해요</span>}
            </span>
            {!insufficient && <span className="text-lg font-bold text-primary">{type === "student" ? "네, 맞아요" : "선택"}</span>}
          </button>
        );
      })}
      <button onClick={onRetry} className="h-14 rounded-2xl text-lg font-semibold text-slate-500 active:bg-slate-200">
        다시 입력하기
      </button>
    </div>
  );
}
