import { db, schema } from "./index";

type SeedOption = { name: string; required?: boolean; min?: number; max?: number; items: [string, number, boolean?][] };
type SeedItem = { name: string; price: number; description?: string; badge?: "NEW" | "BEST"; options?: SeedOption[] };

const temp = (iceOnly = false): SeedOption => ({
  name: "온도",
  required: true,
  max: 1,
  items: iceOnly ? [["ICE", 0, true]] : [["HOT", 0], ["ICE", 0, true]],
});
const size: SeedOption = { name: "사이즈", required: true, max: 1, items: [["R", 0, true], ["L", 500]] };
const shot: SeedOption = { name: "추가", max: 3, items: [["샷 추가", 500], ["시럽 추가", 300], ["휘핑 추가", 500]] };

const MENU: { name: string; emoji: string; items: SeedItem[] }[] = [
  {
    name: "커피",
    emoji: "☕",
    items: [
      { name: "아메리카노", price: 1500, description: "고소한 원두로 내린 기본 커피", badge: "BEST", options: [temp(), size, shot] },
      { name: "카페라떼", price: 2000, description: "부드러운 우유와 에스프레소", options: [temp(), size, shot] },
      { name: "바닐라라떼", price: 2500, description: "달콤한 바닐라 시럽", badge: "BEST", options: [temp(), size, shot] },
      { name: "카라멜마끼아또", price: 2500, options: [temp(), size, shot] },
    ],
  },
  {
    name: "논커피",
    emoji: "🥛",
    items: [
      { name: "초코라떼", price: 2000, description: "진한 초콜릿", options: [temp(), size] },
      { name: "녹차라떼", price: 2000, options: [temp(), size] },
      { name: "딸기라떼", price: 2500, badge: "NEW", options: [temp(true), size] },
    ],
  },
  {
    name: "에이드·티",
    emoji: "🍋",
    items: [
      { name: "레몬에이드", price: 2000, description: "상큼한 레몬 탄산", options: [temp(true), size] },
      { name: "자몽에이드", price: 2000, options: [temp(true), size] },
      { name: "복숭아 아이스티", price: 1500, badge: "BEST", options: [temp(true), size] },
      { name: "캐모마일", price: 1500, options: [temp()] },
    ],
  },
  {
    name: "디저트",
    emoji: "🍪",
    items: [
      { name: "초코칩 쿠키", price: 1000 },
      { name: "크로플", price: 2500, badge: "NEW", options: [{ name: "토핑", max: 2, items: [["아이스크림", 1000], ["메이플 시럽", 0, true]] }] },
      { name: "치즈케이크", price: 3000 },
    ],
  },
];

export function seedIfEmpty() {
  const count = db.select({ id: schema.categories.id }).from(schema.categories).limit(1).all().length;
  if (count > 0) return false;
  db.transaction((tx) => {
    MENU.forEach((cat, ci) => {
      const c = tx.insert(schema.categories).values({ name: cat.name, emoji: cat.emoji, sort: ci }).returning().get();
      cat.items.forEach((item, ii) => {
        const m = tx
          .insert(schema.menuItems)
          .values({ categoryId: c.id, name: item.name, price: item.price, description: item.description ?? "", badge: item.badge ?? null, sort: ii })
          .returning()
          .get();
        item.options?.forEach((g, gi) => {
          const group = tx
            .insert(schema.optionGroups)
            .values({ menuItemId: m.id, name: g.name, required: g.required ?? false, minSelect: g.required ? 1 : g.min ?? 0, maxSelect: g.max ?? 1, sort: gi })
            .returning()
            .get();
          tx.insert(schema.optionItems)
            .values(g.items.map(([name, extraPrice, isDefault], oi) => ({ groupId: group.id, name, extraPrice, isDefault: !!isDefault, sort: oi })))
            .run();
        });
      });
    });
  });
  return true;
}

if (process.argv[1]?.endsWith("seed.ts")) {
  console.log(seedIfEmpty() ? "✓ 샘플 메뉴를 넣었어요" : "이미 메뉴가 있어서 건너뛰었어요");
}
