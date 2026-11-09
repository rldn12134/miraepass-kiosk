import { describe, expect, it } from "vitest";
import { defaultOptionIds, priceCart, priceLine, PricingError } from "@/lib/pricing";
import type { MenuItemDTO } from "@/lib/types";

const americano: MenuItemDTO = {
  id: 1,
  categoryId: 1,
  name: "아메리카노",
  description: "",
  price: 1500,
  imageUrl: null,
  isAvailable: true,
  isSoldOut: false,
  badge: null,
  sort: 0,
  optionGroups: [
    { id: 10, name: "온도", required: true, minSelect: 1, maxSelect: 1, items: [{ id: 1, name: "HOT", extraPrice: 0, isDefault: false }, { id: 2, name: "ICE", extraPrice: 0, isDefault: true }] },
    { id: 11, name: "사이즈", required: true, minSelect: 1, maxSelect: 1, items: [{ id: 3, name: "R", extraPrice: 0, isDefault: true }, { id: 4, name: "L", extraPrice: 500, isDefault: false }] },
    { id: 12, name: "추가", required: false, minSelect: 0, maxSelect: 2, items: [{ id: 5, name: "샷", extraPrice: 500, isDefault: false }, { id: 6, name: "시럽", extraPrice: 300, isDefault: false }, { id: 7, name: "휘핑", extraPrice: 500, isDefault: false }] },
  ],
};

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof PricingError ? e.code : "OTHER";
  }
  return null;
};

describe("priceLine", () => {
  it("옵션 추가 금액을 포함해 단가와 합계를 계산한다", () => {
    const l = priceLine(americano, { menuItemId: 1, quantity: 2, optionItemIds: [2, 4, 5] });
    expect(l.unitPrice).toBe(2500);
    expect(l.lineTotal).toBe(5000);
    expect(l.options.map((o) => o.item)).toEqual(["ICE", "L", "샷"]);
  });

  it("필수 옵션이 빠지면 INVALID_OPTIONS", () => {
    expect(code(() => priceLine(americano, { menuItemId: 1, quantity: 1, optionItemIds: [3] }))).toBe("INVALID_OPTIONS");
  });

  it("최대 선택 수를 넘으면 INVALID_OPTIONS", () => {
    expect(code(() => priceLine(americano, { menuItemId: 1, quantity: 1, optionItemIds: [2, 3, 5, 6, 7] }))).toBe("INVALID_OPTIONS");
  });

  it("다른 메뉴의 옵션 id가 섞이면 INVALID_OPTIONS", () => {
    expect(code(() => priceLine(americano, { menuItemId: 1, quantity: 1, optionItemIds: [2, 3, 999] }))).toBe("INVALID_OPTIONS");
  });

  it("품절·판매중지·없는 메뉴를 거절한다", () => {
    expect(code(() => priceLine({ ...americano, isSoldOut: true }, { menuItemId: 1, quantity: 1, optionItemIds: [2, 3] }))).toBe("ITEM_SOLD_OUT");
    expect(code(() => priceLine({ ...americano, isAvailable: false }, { menuItemId: 1, quantity: 1, optionItemIds: [2, 3] }))).toBe("ITEM_UNAVAILABLE");
    expect(code(() => priceLine(undefined, { menuItemId: 1, quantity: 1, optionItemIds: [] }))).toBe("ITEM_UNAVAILABLE");
  });

  it("수량은 1~20 정수만 허용한다", () => {
    expect(code(() => priceLine(americano, { menuItemId: 1, quantity: 0, optionItemIds: [2, 3] }))).toBe("VALIDATION");
    expect(code(() => priceLine(americano, { menuItemId: 1, quantity: 21, optionItemIds: [2, 3] }))).toBe("VALIDATION");
    expect(code(() => priceLine(americano, { menuItemId: 1, quantity: 1.5, optionItemIds: [2, 3] }))).toBe("VALIDATION");
  });
});

describe("priceCart / defaultOptionIds", () => {
  it("여러 줄의 합계를 낸다", () => {
    const menu = new Map([[1, americano]]);
    const { total } = priceCart(menu, [
      { menuItemId: 1, quantity: 1, optionItemIds: [1, 3] },
      { menuItemId: 1, quantity: 2, optionItemIds: [2, 4] },
    ]);
    expect(total).toBe(1500 + 2000 * 2);
  });

  it("빈 장바구니는 거절한다", () => {
    expect(code(() => priceCart(new Map(), []))).toBe("VALIDATION");
  });

  it("기본 옵션은 isDefault 항목을 고르고 선택 그룹은 비워둔다", () => {
    expect(defaultOptionIds(americano)).toEqual([2, 3]);
  });
});
