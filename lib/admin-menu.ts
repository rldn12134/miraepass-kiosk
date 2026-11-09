import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "./api";
import { db, schema } from "./db";
import { emit } from "./realtime";

export const CategoryBody = z.object({
  name: z.string().trim().min(1).max(20),
  emoji: z.string().trim().min(1).max(8).default("☕"),
  sort: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const OptionItemBody = z.object({
  name: z.string().trim().min(1).max(20),
  extraPrice: z.number().int().min(0).max(100000),
  isDefault: z.boolean().default(false),
});

const OptionGroupBody = z
  .object({
    name: z.string().trim().min(1).max(20),
    required: z.boolean(),
    minSelect: z.number().int().min(0).max(10),
    maxSelect: z.number().int().min(1).max(10),
    items: z.array(OptionItemBody).min(1).max(20),
  })
  .refine((g) => g.minSelect <= g.maxSelect, { message: "최소 선택 수가 최대 선택 수보다 클 수 없어요" })
  .refine((g) => g.maxSelect <= g.items.length, { message: "최대 선택 수가 옵션 개수보다 많아요" })
  .refine((g) => g.items.filter((i) => i.isDefault).length <= g.maxSelect, { message: "기본 선택 옵션이 너무 많아요" });

export const MenuItemBody = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(30),
  description: z.string().trim().max(100).default(""),
  price: z.number().int().min(0).max(1000000),
  imageUrl: z.string().max(300).nullable().default(null),
  isAvailable: z.boolean().default(true),
  isSoldOut: z.boolean().default(false),
  badge: z.enum(["NEW", "BEST"]).nullable().default(null),
  sort: z.number().int().default(0),
  optionGroups: z.array(OptionGroupBody).max(10).default([]),
});
export type MenuItemInput = z.infer<typeof MenuItemBody>;

/** 메뉴 + 옵션을 통째로 저장 (옵션은 삭제 후 재생성. 주문 내역은 스냅샷이라 영향 없음) */
export function saveMenuItem(input: MenuItemInput, id?: number) {
  const { optionGroups, ...fields } = input;
  const cat = db.select().from(schema.categories).where(eq(schema.categories.id, fields.categoryId)).get();
  if (!cat) throw new ApiError("NOT_FOUND", "카테고리를 찾을 수 없어요", 404);

  const savedId = db.transaction((tx) => {
    let menuId = id;
    if (menuId) {
      const row = tx.update(schema.menuItems).set(fields).where(eq(schema.menuItems.id, menuId)).returning().get();
      if (!row) throw new ApiError("NOT_FOUND", "메뉴를 찾을 수 없어요", 404);
      tx.delete(schema.optionGroups).where(eq(schema.optionGroups.menuItemId, menuId)).run();
    } else {
      menuId = tx.insert(schema.menuItems).values(fields).returning().get().id;
    }
    optionGroups.forEach((g, gi) => {
      const group = tx
        .insert(schema.optionGroups)
        .values({
          menuItemId: menuId!,
          name: g.name,
          required: g.required,
          minSelect: g.required ? Math.max(1, g.minSelect) : g.minSelect,
          maxSelect: g.maxSelect,
          sort: gi,
        })
        .returning()
        .get();
      tx.insert(schema.optionItems)
        .values(g.items.map((o, oi) => ({ groupId: group.id, name: o.name, extraPrice: o.extraPrice, isDefault: o.isDefault, sort: oi })))
        .run();
    });
    return menuId!;
  });
  notifyMenuChanged();
  return savedId;
}

export function notifyMenuChanged() {
  emit(["kiosk", "staff", "admin"], "menu:changed");
}
