import type { Metadata } from "next";
import { KioskApp } from "@/components/kiosk/kiosk-app";

export const metadata: Metadata = { title: "키오스크" };

export default function KioskPage() {
  return <KioskApp />;
}
