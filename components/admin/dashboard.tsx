"use client";

import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { AlertTriangle, ClipboardList, Coins, ReceiptText, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/fetcher";
import { formatPoint } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import type { StatsResponse } from "@/lib/types";

type Range = "today" | "7d" | "30d";

/** KST 기준 날짜 문자열 */
const kstDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);

function rangeDates(r: Range) {
  const now = new Date();
  const to = kstDate(now);
  const from = r === "today" ? to : kstDate(subDays(now, r === "7d" ? 6 : 29));
  return { from, to };
}

// 단일 계열 차트는 브랜드 primary 하나만 사용 (범례 없음, 제목이 계열을 설명)
const revenueConfig = { revenue: { label: "매출", color: "var(--chart-1)" } } satisfies ChartConfig;
const ordersConfig = { orders: { label: "주문 수", color: "var(--chart-1)" } } satisfies ChartConfig;
const menuConfig = { quantity: { label: "판매 수량", color: "var(--chart-1)" } } satisfies ChartConfig;

// 학생/교사 2계열: validate_palette.js로 검증 (#2563eb / #f59e0b, CVD ΔE 37). 앰버는 대비가 낮아 값 라벨을 항상 텍스트로 표시
const MIX_COLORS = { student: "#2563eb", teacher: "#f59e0b" } as const;

const compact = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("ko-KR"));

export function Dashboard() {
  const [range, setRange] = useState<Range>("7d");
  const { from, to } = rangeDates(range);
  const stats = useQuery({
    queryKey: qk.stats(from, to),
    queryFn: () => api<StatsResponse>(`/api/admin/stats?from=${from}&to=${to}`),
    refetchInterval: 60_000,
  });
  const s = stats.data;

  return (
    <div className="space-y-5">
      {/* 필터는 차트 위 한 줄 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {from === to ? from : `${from} ~ ${to}`} · 취소·결제 실패 주문 제외
        </p>
        <ToggleGroup
          type="single"
          value={range}
          onValueChange={(v) => v && setRange(v as Range)}
          variant="outline"
          className="bg-white"
        >
          <ToggleGroupItem value="today" className="px-4">
            오늘
          </ToggleGroupItem>
          <ToggleGroupItem value="7d" className="px-4">
            7일
          </ToggleGroupItem>
          <ToggleGroupItem value="30d" className="px-4">
            30일
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* KPI (차트 대신 숫자) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Coins} label="매출" value={s?.kpi.revenue} suffix="P" loading={!s} />
        <Kpi icon={ReceiptText} label="주문 수" value={s?.kpi.orders} suffix="건" loading={!s} />
        <Kpi icon={ClipboardList} label="평균 주문 금액" value={s?.kpi.avgTicket} suffix="P" loading={!s} />
        <Kpi icon={XCircle} label="취소" value={s?.kpi.cancelled} suffix="건" loading={!s} />
      </div>

      {s && s.kpi.refundFailed > 0 && (
        <Link
          href="/admin/orders?payment=refund_failed"
          className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          <AlertTriangle className="size-5 shrink-0" />
          <span className="font-semibold">환불에 실패한 주문이 {s.kpi.refundFailed}건 있어요. 눌러서 재시도하세요.</span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>일별 매출</CardTitle>
            <CardDescription>포인트 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              <ChartContainer config={revenueConfig} className="aspect-auto h-64 w-full">
                <AreaChart data={s.daily} margin={{ left: 4, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(d: string) => d.slice(5).replace("-", "/")} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compact} allowDecimals={false} />
                  <ChartTooltip
                    cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
                    content={<ChartTooltipContent labelFormatter={(d) => String(d)} formatter={(v) => formatPoint(Number(v))} />}
                  />
                  <Area
                    dataKey="revenue"
                    type="linear"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                    fill="var(--color-revenue)"
                    fillOpacity={0.1}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-64" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>학생 · 교사 비율</CardTitle>
            <CardDescription>매출 기준</CardDescription>
          </CardHeader>
          <CardContent>{s ? <CustomerMix data={s.customerMix} /> : <Skeleton className="h-40" />}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시간대별 주문</CardTitle>
            <CardDescription>주문 건수</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              <ChartContainer config={ordersConfig} className="aspect-auto h-56 w-full">
                <BarChart data={s.hourly} margin={{ left: 0, right: 4, top: 8 }} barCategoryGap={4}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tickFormatter={(h: number) => `${h}시`} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                    content={<ChartTooltipContent labelFormatter={(_, p) => `${p?.[0]?.payload?.hour}시`} formatter={(v) => `${v}건`} />}
                  />
                  <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-56" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>인기 메뉴 TOP 10</CardTitle>
            <CardDescription>판매 수량</CardDescription>
          </CardHeader>
          <CardContent>
            {s ? (
              s.topMenus.length === 0 ? (
                <p className="py-16 text-center text-muted-foreground">아직 판매 기록이 없어요</p>
              ) : (
                <ChartContainer config={menuConfig} className="aspect-auto w-full" style={{ height: Math.max(160, s.topMenus.length * 34) }}>
                  <BarChart data={s.topMenus} layout="vertical" margin={{ left: 8, right: 48 }} barCategoryGap={6}>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                      content={
                        <ChartTooltipContent
                          formatter={(v, _n, p) => `${v}개 · ${formatPoint(Number(p?.payload?.revenue ?? 0))}`}
                        />
                      }
                    />
                    <Bar
                      dataKey="quantity"
                      fill="var(--color-quantity)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={24}
                      label={{ position: "right", fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                  </BarChart>
                </ChartContainer>
              )
            ) : (
              <Skeleton className="h-64" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  suffix,
  loading,
}: {
  icon: typeof Coins;
  label: string;
  value?: number;
  suffix: string;
  loading: boolean;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardContent className="space-y-2 px-5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" /> {label}
        </p>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className="text-3xl font-extrabold tabular-nums">
            <NumberTicker value={value ?? 0} />
            <span className="ml-0.5 text-lg font-bold text-muted-foreground">{suffix}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** 2개 범주의 구성비: 파이 대신 2px 간격의 막대 + 범례 + 텍스트 값 */
function CustomerMix({ data }: { data: StatsResponse["customerMix"] }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const rows = (["student", "teacher"] as const).map((type) => {
    const d = data.find((x) => x.type === type);
    return { type, label: type === "student" ? "학생" : "교사", revenue: d?.revenue ?? 0, orders: d?.orders ?? 0 };
  });
  if (total === 0) return <p className="py-12 text-center text-muted-foreground">아직 판매 기록이 없어요</p>;
  return (
    <div className="space-y-5">
      <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label="학생 교사 매출 비율">
        {rows
          .filter((r) => r.revenue > 0)
          .map((r) => (
            <div
              key={r.type}
              title={`${r.label} ${Math.round((r.revenue / total) * 100)}%`}
              style={{ width: `${(r.revenue / total) * 100}%`, background: MIX_COLORS[r.type] }}
            />
          ))}
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.type} className="flex items-center gap-3">
            <span className="size-3 rounded-sm" style={{ background: MIX_COLORS[r.type] }} aria-hidden />
            <span className="font-semibold">{r.label}</span>
            <span className="ml-auto text-right text-sm tabular-nums">
              <span className="font-bold">{Math.round((r.revenue / total) * 100)}%</span>
              <span className="ml-2 text-muted-foreground">
                {formatPoint(r.revenue)} · {r.orders}건
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

