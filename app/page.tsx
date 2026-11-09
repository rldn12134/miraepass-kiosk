import { ChefHat, LayoutDashboard, MonitorSmartphone } from "lucide-react";
import Link from "next/link";
import { BlurFade } from "@/components/ui/blur-fade";

const DEVICES = [
  { href: "/kiosk", title: "키오스크", desc: "학생·선생님이 직접 주문하고 MIRAEPASS로 결제해요", icon: MonitorSmartphone },
  { href: "/staff", title: "주문 처리", desc: "직원용 · 실시간으로 주문을 받고 음성으로 호출해요", icon: ChefHat },
  { href: "/admin", title: "관리자", desc: "메뉴 등록, 주문 기록, 매출 통계, 영업시간 설정", icon: LayoutDashboard },
];

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-12">
      <BlurFade className="flex flex-col items-center gap-3 text-center">
        <img src="/favicon.svg" alt="" className="h-16" />
        <h1 className="text-h6 font-extrabold md:text-h4">미래카페</h1>
        <p className="text-lg text-muted-foreground">순천미래과학고등학교 교내 카페 · MIRAEPASS 결제</p>
      </BlurFade>
      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
        {DEVICES.map((d, i) => (
          <BlurFade key={d.href} delay={0.1 + i * 0.08}>
            <Link
              href={d.href}
              className="group flex h-full flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/30"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <d.icon className="size-7" />
              </span>
              <span>
                <span className="block text-xl font-bold">{d.title}</span>
                <span className="mt-1 block text-muted-foreground">{d.desc}</span>
              </span>
            </Link>
          </BlurFade>
        ))}
      </div>
    </main>
  );
}
