import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { computeStoreStatus } from "./store-hours";
import type { AppSettings, StoreStatus } from "./types";

const weekday = { open: "08:00", close: "17:00", closed: false };
const weekend = { open: "08:00", close: "17:00", closed: true };

export const DEFAULT_SETTINGS: AppSettings = {
  storeHours: { "0": weekend, "1": weekday, "2": weekday, "3": weekday, "4": weekday, "5": weekday, "6": weekend },
  manualClosed: { closed: false, message: "" },
  voice: {
    newOrder: "주문이 들어왔어요.",
    callStudent: "{grade}학년 {name}님, 주문하신 음료가 나왔습니다.",
    callTeacher: "{name} 선생님, 주문하신 음료가 나왔습니다.",
    rate: 1,
  },
  kiosk: { idleSeconds: 60, doneSeconds: 10, shufflePinPad: true },
};

export function getSettings(): AppSettings {
  const rows = db.select().from(schema.settings).all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<AppSettings>;
  return {
    storeHours: { ...DEFAULT_SETTINGS.storeHours, ...map.storeHours },
    manualClosed: { ...DEFAULT_SETTINGS.manualClosed, ...map.manualClosed },
    voice: { ...DEFAULT_SETTINGS.voice, ...map.voice },
    kiosk: { ...DEFAULT_SETTINGS.kiosk, ...map.kiosk },
  };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  db.transaction((tx) => {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      tx.insert(schema.settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
        .run();
    }
  });
  return getSettings();
}

export function getStoreStatus(now = new Date()): StoreStatus {
  const s = getSettings();
  return computeStoreStatus(s.storeHours, s.manualClosed, now);
}

export function deleteSetting(key: keyof AppSettings) {
  db.delete(schema.settings).where(eq(schema.settings.key, key)).run();
}
