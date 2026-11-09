"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Loader2, RotateCcw, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ClientApiError } from "@/lib/fetcher";
import { customerLabel, formatPoint, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import type { OrderDTO, OrderStatus, PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ListResponse = { items: OrderDTO[]; total: number; page: number; size: number; pages: number };
type Detail = {
  order: OrderDTO;
  actions: { id: number; actorName: string | null; action: string; detail: string | null; createdAt: string }[];
};

const ACTION_LABEL: Record<string, string> = {
  accept: "접수",
  ready: "제조 완료 · 호출",
  complete: "픽업 완료",
  cancel: "취소",
  refund: "환불 완료",
  refund_failed: "환불 실패",
  recall: "재호출",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-slate-100 text-slate-600",
  failed: "bg-slate-100 text-slate-500",
  received: "bg-blue-50 text-blue-700",
  preparing: "bg-amber-50 text-amber-700",
  ready: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-50 text-red-700",
};

const kstDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);

export function OrdersView() {
  const router = useRouter();
  const sp = useSearchParams();
  const [{ today, weekAgo }] = useState(() => {
    const now = new Date();
    return { today: kstDate(now), weekAgo: kstDate(new Date(now.getTime() - 6 * 86400000)) };
  });

  const params = {
    from: sp.get("from") ?? (sp.get("payment") ? "" : weekAgo),
    to: sp.get("to") ?? (sp.get("payment") ? "" : today),
    status: sp.get("status") ?? "",
    payment: sp.get("payment") ?? "",
    customerType: sp.get("customerType") ?? "",
    q: sp.get("q") ?? "",
    page: Number(sp.get("page") ?? 1),
  };
  const [q, setQ] = useState(params.q);
  const [detailId, setDetailId] = useState<number | null>(null);

  const setParam = (patch: Partial<Record<keyof typeof params, string | number>>) => {
    const next = new URLSearchParams();
    const merged = { ...params, page: 1, ...patch };
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== "" && v !== undefined && !(k === "page" && v === 1)) next.set(k, String(v));
    });
    // 빈 기간은 '전체 기간'을 의미하므로 명시
    if (!merged.from) next.set("from", "");
    if (!merged.to) next.set("to", "");
    router.replace(`/admin/orders?${next.toString()}`);
  };

  const query = new URLSearchParams(
    Object.entries({ ...params, size: 30 }).filter(([, v]) => v !== "" && v !== undefined) as [string, string][],
  ).toString();

  const list = useQuery({
    queryKey: qk.adminOrders(params),
    queryFn: () => api<ListResponse>(`/api/admin/orders?${query}`),
    placeholderData: keepPreviousData,
  });

  const exportUrl = `/api/admin/orders/export?${new URLSearchParams(
    Object.entries(params).filter(([k, v]) => v !== "" && k !== "page") as [string, string][],
  ).toString()}`;

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardContent className="flex flex-wrap items-end gap-3 px-4">
          <Filter label="시작일">
            <Input type="date" value={params.from} max={params.to || undefined} onChange={(e) => setParam({ from: e.target.value })} className="w-40" />
          </Filter>
          <Filter label="종료일">
            <Input type="date" value={params.to} min={params.from || undefined} onChange={(e) => setParam({ to: e.target.value })} className="w-40" />
          </Filter>
          <Filter label="주문 상태">
            <SelectFilter
              value={params.status}
              onChange={(v) => setParam({ status: v })}
              options={(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => [s, STATUS_LABEL[s]])}
            />
          </Filter>
          <Filter label="결제 상태">
            <SelectFilter
              value={params.payment}
              onChange={(v) => setParam({ payment: v })}
              options={(Object.keys(PAYMENT_LABEL) as PaymentStatus[]).map((s) => [s, PAYMENT_LABEL[s]])}
            />
          </Filter>
          <Filter label="구분">
            <SelectFilter
              value={params.customerType}
              onChange={(v) => setParam({ customerType: v })}
              options={[
                ["student", "학생"],
                ["teacher", "교사"],
              ]}
            />
          </Filter>
          <form
            className="flex flex-1 items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ q });
            }}
          >
            <Filter label="검색" className="min-w-48 flex-1">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 학번 · 주문번호" />
            </Filter>
            <Button type="submit" variant="secondary" size="icon-lg" aria-label="검색">
              <Search />
            </Button>
          </form>
          <Button variant="outline" size="lg" asChild>
            <a href={exportUrl}>
              <Download /> CSV
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">주문</TableHead>
                <TableHead>일시</TableHead>
                <TableHead>고객</TableHead>
                <TableHead>품목</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="pr-4">결제</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isPending &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6" />
                    </TableCell>
                  </TableRow>
                ))}
              {list.data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                    조건에 맞는 주문이 없어요
                  </TableCell>
                </TableRow>
              )}
              {list.data?.items.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => setDetailId(o.id)}>
                  <TableCell className="pl-4 font-bold tabular-nums">{o.orderNo ? `#${o.orderNo}` : "-"}</TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {o.businessDate.slice(5)}{" "}
                    {new Date(o.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" })}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{customerLabel(o)}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{o.customerId}</span>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-sm">
                    {o.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatPoint(o.total)}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", STATUS_TONE[o.status])}>{STATUS_LABEL[o.status]}</span>
                  </TableCell>
                  <TableCell className="pr-4">
                    <span className={cn("text-xs font-semibold", o.paymentStatus === "refund_failed" && "text-destructive")}>
                      {PAYMENT_LABEL[o.paymentStatus]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {list.data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>총 {list.data.total.toLocaleString()}건</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled={params.page <= 1} onClick={() => setParam({ page: params.page - 1 })} aria-label="이전 페이지">
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">
              {list.data.page} / {list.data.pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={params.page >= list.data.pages}
              onClick={() => setParam({ page: params.page + 1 })}
              aria-label="다음 페이지"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <OrderDetailSheet id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function Filter({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체</SelectItem>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function OrderDetailSheet({ id, onClose }: { id: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: qk.adminOrder(id ?? 0),
    queryFn: () => api<Detail>(`/api/admin/orders/${id}`),
    enabled: !!id,
  });
  const refund = useMutation({
    mutationFn: () => api<OrderDTO>(`/api/admin/orders/${id}/refund`, { method: "POST" }),
    onSuccess: () => {
      toast.success("환불했어요");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => {
      toast.error(e instanceof ClientApiError ? e.message : "환불에 실패했어요");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const o = detail.data?.order;

  return (
    <Sheet open={!!id} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{o ? (o.orderNo ? `주문 #${o.orderNo}` : `주문 ID ${o.id}`) : "주문 상세"}</SheetTitle>
          <SheetDescription>{o && `${o.businessDate} · ${customerLabel(o)} (${o.customerId})`}</SheetDescription>
        </SheetHeader>
        {!o ? (
          <div className="p-4">
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6 px-4 pb-6">
            <div className="flex gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", STATUS_TONE[o.status])}>{STATUS_LABEL[o.status]}</span>
              <Badge variant={o.paymentStatus === "refund_failed" ? "destructive" : "secondary"}>{PAYMENT_LABEL[o.paymentStatus]}</Badge>
            </div>

            {o.paymentStatus === "refund_failed" && (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-700">MIRAEPASS 환불에 실패했어요. 다시 시도하거나 MIRAEPASS 관리자에서 직접 지급해 주세요.</p>
                <Button variant="destructive" disabled={refund.isPending} onClick={() => refund.mutate()}>
                  {refund.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
                  환불 재시도 ({formatPoint(o.total)})
                </Button>
              </div>
            )}

            <section>
              <h3 className="mb-2 text-sm font-bold text-muted-foreground">품목</h3>
              <ul className="divide-y rounded-xl border">
                {o.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3 p-3">
                    <span>
                      <span className="font-semibold">{i.name}</span> × {i.quantity}
                      {i.options.length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {i.options.map((x) => `${x.item}${x.extra ? ` +${x.extra}` : ""}`).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold tabular-nums">{formatPoint(i.unitPrice * i.quantity)}</span>
                  </li>
                ))}
                <li className="flex justify-between p-3 font-bold">
                  <span>합계</span>
                  <span>{formatPoint(o.total)}</span>
                </li>
              </ul>
              {o.balanceAfter !== null && <p className="mt-2 text-xs text-muted-foreground">결제 후 고객 잔액 {formatPoint(o.balanceAfter)}</p>}
              {o.failReason && <p className="mt-2 text-xs text-destructive">실패 사유: {o.failReason}</p>}
              {o.cancelReason && <p className="mt-2 text-xs text-muted-foreground">취소 사유: {o.cancelReason}</p>}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-bold text-muted-foreground">처리 기록</h3>
              <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                <TimelineItem time={o.createdAt} label={o.status === "failed" ? "결제 실패" : "주문 · 결제"} who="키오스크" />
                {detail.data?.actions.map((a) => (
                  <TimelineItem key={a.id} time={a.createdAt} label={ACTION_LABEL[a.action] ?? a.action} who={a.actorName ?? "-"} detail={a.detail} />
                ))}
              </ol>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TimelineItem({ time, label, who, detail }: { time: string; label: string; who: string; detail?: string | null }) {
  return (
    <li className="relative">
      <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-primary" />
      <p className="text-sm font-semibold">
        {label} <span className="font-normal text-muted-foreground">· {who}</span>
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {new Date(time).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
        {detail && ` · ${detail}`}
      </p>
    </li>
  );
}
