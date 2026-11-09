import type { DayHours, ManualClosed, StoreHours, StoreStatus } from "./types";

const TZ = "Asia/Seoul";
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 서버 타임존과 무관하게 KST 기준 요일/시각을 구한다 */
export function kstParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    hour: Number(parts.hour),
  };
}

export function businessDate(date = new Date()): string {
  return kstParts(date).date;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function computeStoreStatus(
  hours: StoreHours,
  manual: ManualClosed,
  now: Date = new Date(),
): StoreStatus {
  const { weekday, minutes } = kstParts(now);
  const today: DayHours = hours[String(weekday) as keyof StoreHours];
  const nextOpenAt = findNextOpen(hours, now);

  if (manual.closed) {
    return {
      open: false,
      reason: "manual",
      message: manual.message || "잠시 주문을 받지 않아요",
      todayHours: today,
      nextOpenAt: null,
    };
  }
  if (!today || today.closed) {
    return { open: false, reason: "holiday", message: "오늘은 쉬는 날이에요", todayHours: today ?? null, nextOpenAt };
  }
  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  if (minutes >= open && minutes < close) {
    return { open: true, reason: "open", message: "영업 중", todayHours: today, nextOpenAt: null };
  }
  return {
    open: false,
    reason: "hours",
    message: minutes < open ? "아직 영업 전이에요" : "오늘 영업이 끝났어요",
    todayHours: today,
    nextOpenAt,
  };
}

/** 다음 영업 시작 시각을 "목요일 08:00" 같은 사람이 읽는 문자열로 반환 */
export function findNextOpen(hours: StoreHours, now: Date = new Date()): string | null {
  const { weekday, minutes } = kstParts(now);
  for (let offset = 0; offset < 8; offset++) {
    const day = (weekday + offset) % 7;
    const h = hours[String(day) as keyof StoreHours];
    if (!h || h.closed) continue;
    if (offset === 0 && minutes >= toMinutes(h.open)) continue;
    const label = offset === 0 ? "오늘" : offset === 1 ? "내일" : `${WEEKDAY_KO[day]}요일`;
    return `${label} ${h.open}`;
  }
  return null;
}

export { WEEKDAY_KO };
