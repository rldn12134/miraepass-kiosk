import { asc } from "drizzle-orm";
import { db, schema } from "./db";
import type { CategoryDTO, MenuItemDTO } from "./types";

/** 카테고리 → 메뉴 → 옵션그룹 → 옵션 트리. includeHidden=false면 키오스크용(판매중·활성만) */
export function getMenuTree({ includeHidden = false } = {}): CategoryDTO[] {
  const cats = db.select().from(schema.categories).orderBy(asc(schema.categories.sort), asc(schema.categories.id)).all();
  const items = db.select().from(schema.menuItems).orderBy(asc(schema.menuItems.sort), asc(schema.menuItems.id)).all();
  const groups = db.select().from(schema.optionGroups).orderBy(asc(schema.optionGroups.sort), asc(schema.optionGroups.id)).all();
  const opts = db.select().from(schema.optionItems).orderBy(asc(schema.optionItems.sort), asc(schema.optionItems.id)).all();

  const groupDTOs = new Map<number, MenuItemDTO["optionGroups"]>();
  for (const g of groups) {
    const list = groupDTOs.get(g.menuItemId) ?? [];
    list.push({
      id: g.id,
      name: g.name,
      required: g.required,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      items: opts
        .filter((o) => o.groupId === g.id)
        .map((o) => ({ id: o.id, name: o.name, extraPrice: o.extraPrice, isDefault: o.isDefault })),
    });
    groupDTOs.set(g.menuItemId, list);
  }

  return cats
    .filter((c) => includeHidden || c.isActive)
    .map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      sort: c.sort,
      isActive: c.isActive,
      items: items
        .filter((i) => i.categoryId === c.id && (includeHidden || i.isAvailable))
        .map((i) => ({
          id: i.id,
          categoryId: i.categoryId,
          name: i.name,
          description: i.description,
          price: i.price,
          imageUrl: i.imageUrl,
          isAvailable: i.isAvailable,
          isSoldOut: i.isSoldOut,
          badge: i.badge,
          sort: i.sort,
          optionGroups: groupDTOs.get(i.id) ?? [],
        })),
    }));
}

export function getMenuMap(): Map<number, MenuItemDTO> {
  const map = new Map<number, MenuItemDTO>();
  for (const c of getMenuTree({ includeHidden: true })) {
    for (const i of c.items) map.set(i.id, c.isActive ? i : { ...i, isAvailable: false });
  }
  return map;
}
