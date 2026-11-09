import { handler, ok } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
/** 키오스크·직원 화면이 쓰는 공개 설정 (영업시간 원본·토큰 제외) */
export const GET = handler(async () => {
  const { voice, kiosk } = getSettings();
  return ok({ voice, kiosk });
});
