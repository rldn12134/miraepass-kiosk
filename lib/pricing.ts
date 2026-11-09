import type { CartLineInput, MenuItemDTO, OptionSnapshot } from "./types";

export class PricingError extends Error {
  constructor(
    public code: "ITEM_SOLD_OUT" | "ITEM_UNAVAILABLE" | "INVALID_OPTIONS" | "VALIDATION",
    message: string,
    public menuItemId?: number,
  ) {
    super(message);
  }
}

export type PricedLine = {
  menuItemId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  options: OptionSnapshot[];
  lineTotal: number;
};

/**
 * 메뉴 정보(서버 DB 기준)로 장바구니 한 줄의 가격을 계산하고 옵션 규칙을 검증한다.
 * 클라이언트(장바구니 미리보기)와 서버(결제 금액 확정)가 같은 함수를 쓴다.
 */
export function priceLine(item: MenuItemDTO | undefined, line: CartLineInput): PricedLine {
  if (!item) throw new PricingError("ITEM_UNAVAILABLE", "존재하지 않는 메뉴예요", line.menuItemId);
  if (!item.isAvailable) throw new PricingError("ITEM_UNAVAILABLE", `${item.name}은(는) 판매하지 않아요`, item.id);
  if (item.isSoldOut) throw new PricingError("ITEM_SOLD_OUT", `${item.name}이(가) 품절됐어요`, item.id);
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
    throw new PricingError("VALIDATION", "수량이 올바르지 않아요", item.id);
  }

  const selected = new Set(line.optionItemIds);
  const known = new Set<number>();
  const options: OptionSnapshot[] = [];
  let extra = 0;

  for (const group of item.optionGroups) {
    const picked = group.items.filter((o) => selected.has(o.id));
    group.items.forEach((o) => known.add(o.id));
    const min = group.required ? Math.max(1, group.minSelect) : group.minSelect;
    if (picked.length < min || picked.length > group.maxSelect) {
      throw new PricingError("INVALID_OPTIONS", `${item.name}의 '${group.name}' 옵션을 다시 선택해 주세요`, item.id);
    }
    for (const o of picked) {
      extra += o.extraPrice;
      options.push({ group: group.name, item: o.name, extra: o.extraPrice });
    }
  }
  for (const id of selected) {
    if (!known.has(id)) throw new PricingError("INVALID_OPTIONS", `${item.name}의 옵션이 변경됐어요`, item.id);
  }

  const unitPrice = item.price + extra;
  return {
    menuItemId: item.id,
    name: item.name,
    unitPrice,
    quantity: line.quantity,
    options,
    lineTotal: unitPrice * line.quantity,
  };
}

export function priceCart(menu: Map<number, MenuItemDTO>, lines: CartLineInput[]) {
  if (lines.length === 0) throw new PricingError("VALIDATION", "장바구니가 비어 있어요");
  const priced = lines.map((l) => priceLine(menu.get(l.menuItemId), l));
  const total = priced.reduce((sum, l) => sum + l.lineTotal, 0);
  return { lines: priced, total };
}

/** 기본 선택값: 필수 그룹은 isDefault 항목(없으면 첫 항목) */
export function defaultOptionIds(item: MenuItemDTO): number[] {
  const ids: number[] = [];
  for (const g of item.optionGroups) {
    const defaults = g.items.filter((o) => o.isDefault).slice(0, g.maxSelect);
    if (defaults.length) ids.push(...defaults.map((o) => o.id));
    else if (g.required && g.items[0]) ids.push(g.items[0].id);
  }
  return ids;
}
