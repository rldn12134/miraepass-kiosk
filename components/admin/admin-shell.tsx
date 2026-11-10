"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Coffee, LayoutDashboard, LogOut, MonitorSmartphone, Settings, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useMe, useStoreStatus } from "@/hooks/queries";
import { useSocket } from "@/hooks/use-socket";
import { api } from "@/lib/fetcher";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/menu", label: "메뉴 관리", icon: Coffee },
  { href: "/admin/orders", label: "주문 기록", icon: ClipboardList },
  { href: "/admin/settings", label: "설정", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const qc = useQueryClient();
  const me = useMe();
  const status = useStoreStatus();

  // 관리자 화면도 실시간으로 갱신
  useSocket(
    { role: "staff" },
    {
      "order:new": () => qc.invalidateQueries({ queryKey: ["admin"] }),
      "order:updated": () => qc.invalidateQueries({ queryKey: ["admin"] }),
      "menu:changed": () => qc.invalidateQueries({ queryKey: qk.adminMenu }),
      "store:changed": (s) => qc.setQueryData(qk.storeStatus, s),
    },
  );

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    window.location.replace("/admin/login");
  };

  const current = NAV.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)));

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 py-5">
          <Link href="/admin" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-8" />
            <span>
              <span className="block text-lg leading-tight font-extrabold">미래카페</span>
              <span className="block text-xs text-muted-foreground">관리자</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>관리</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map((n) => (
                  <SidebarMenuItem key={n.href}>
                    <SidebarMenuButton asChild isActive={current?.href === n.href} size="lg">
                      <Link href={n.href}>
                        <n.icon />
                        <span className="text-base">{n.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>바로가기</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/staff">
                      <Store />
                      <span>주문 처리 화면</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="/kiosk" target="_blank" rel="noreferrer">
                      <MonitorSmartphone />
                      <span>키오스크 열기</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{me.data?.name ?? "…"}</p>
              <p className="text-xs text-muted-foreground">MIRAEPASS ID {me.data?.id}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-muted-foreground hover:bg-slate-200" aria-label="로그아웃">
              <LogOut className="size-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <h1 className="text-lg font-bold">{current?.label}</h1>
          <span
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              status.data?.open ? "bg-blue-50 text-primary" : "bg-slate-200 text-slate-500",
            )}
          >
            <span className={cn("size-2 rounded-full", status.data?.open ? "bg-primary" : "bg-slate-400")} />
            {status.data?.open ? "영업 중" : (status.data?.message ?? "…")}
          </span>
        </header>
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
