"use client";

import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { KIOSK_TOKEN_KEY } from "@/lib/fetcher";
import type { CreateOrderResult, CustomerCandidate, MenuItemDTO, OptionSnapshot } from "@/lib/types";

/** Jotai: 키오스크 한 세션(주문 1건) 동안의 클라이언트 상태 */

export type KioskStep = "attract" | "menu" | "review" | "identify" | "pin" | "paying" | "done" | "error";

export type CartLine = {
  key: string;
  menuItemId: number;
  name: string;
  imageUrl: string | null;
  quantity: number;
  optionItemIds: number[];
  options: OptionSnapshot[];
  unitPrice: number;
};

export type SelectedCustomer = CustomerCandidate;

export type KioskError = { code: string; message: string; retryable: boolean };

const storage = createJSONStorage<string | null>(() => localStorage);

export const kioskTokenAtom = atomWithStorage<string | null>(KIOSK_TOKEN_KEY, null, {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {}
  },
  removeItem: (key) => storage.removeItem(key),
}, { getOnInit: true });

export const stepAtom = atom<KioskStep>("attract");
export const cartAtom = atom<CartLine[]>([]);
export const activeCategoryAtom = atom<number | null>(null);
export const customerAtom = atom<SelectedCustomer | null>(null);
export const idempotencyKeyAtom = atom<string>("");
export const orderResultAtom = atom<CreateOrderResult | null>(null);
export const kioskErrorAtom = atom<KioskError | null>(null);
/** 입력한 결제 비밀번호: 결제 요청에만 쓰고 끝나면 바로 비운다 */
export const pinAtom = atom<string>("");
/** 비밀번호가 틀렸을 때 비밀번호 화면에 보여줄 안내 */
export const pinErrorAtom = atom<{ message: string; at: number } | null>(null);

export const cartCountAtom = atom((get) => get(cartAtom).reduce((s, l) => s + l.quantity, 0));
export const cartTotalAtom = atom((get) => get(cartAtom).reduce((s, l) => s + l.unitPrice * l.quantity, 0));

const lineKey = (menuItemId: number, optionItemIds: number[]) =>
  `${menuItemId}:${[...optionItemIds].sort((a, b) => a - b).join(",")}`;

/** 같은 메뉴·같은 옵션이면 수량만 합친다 */
export const addToCartAtom = atom(
  null,
  (get, set, payload: { item: MenuItemDTO; optionItemIds: number[]; quantity: number }) => {
    const { item, optionItemIds, quantity } = payload;
    const picked = item.optionGroups.flatMap((g) =>
      g.items.filter((o) => optionItemIds.includes(o.id)).map((o) => ({ group: g.name, item: o.name, extra: o.extraPrice })),
    );
    const unitPrice = item.price + picked.reduce((s, o) => s + o.extra, 0);
    const key = lineKey(item.id, optionItemIds);
    const cart = get(cartAtom);
    const existing = cart.find((l) => l.key === key);
    if (existing) {
      set(
        cartAtom,
        cart.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l)),
      );
    } else {
      set(cartAtom, [
        ...cart,
        { key, menuItemId: item.id, name: item.name, imageUrl: item.imageUrl, quantity, optionItemIds, options: picked, unitPrice },
      ]);
    }
  },
);

export const updateQuantityAtom = atom(null, (get, set, { key, delta }: { key: string; delta: number }) => {
  set(
    cartAtom,
    get(cartAtom)
      .map((l) => (l.key === key ? { ...l, quantity: Math.min(20, l.quantity + delta) } : l))
      .filter((l) => l.quantity > 0),
  );
});

export const removeLineAtom = atom(null, (get, set, key: string) => {
  set(cartAtom, get(cartAtom).filter((l) => l.key !== key));
});

/** 메뉴 변경(가격·품절) 시 장바구니를 최신 메뉴 기준으로 다시 맞춘다 */
export const syncCartWithMenuAtom = atom(null, (get, set, menu: Map<number, MenuItemDTO>) => {
  const next: CartLine[] = [];
  for (const line of get(cartAtom)) {
    const item = menu.get(line.menuItemId);
    if (!item || item.isSoldOut || !item.isAvailable) continue;
    const validIds = new Set(item.optionGroups.flatMap((g) => g.items.map((o) => o.id)));
    if (!line.optionItemIds.every((id) => validIds.has(id))) continue;
    const extra = item.optionGroups
      .flatMap((g) => g.items)
      .filter((o) => line.optionItemIds.includes(o.id))
      .reduce((s, o) => s + o.extraPrice, 0);
    next.push({ ...line, name: item.name, imageUrl: item.imageUrl, unitPrice: item.price + extra });
  }
  set(cartAtom, next);
});

export const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** 주문 1건 종료 → 처음 상태로 */
export const resetKioskAtom = atom(null, (_get, set, step: KioskStep = "attract") => {
  set(cartAtom, []);
  set(customerAtom, null);
  set(orderResultAtom, null);
  set(kioskErrorAtom, null);
  set(pinAtom, "");
  set(pinErrorAtom, null);
  set(idempotencyKeyAtom, "");
  set(activeCategoryAtom, null);
  set(stepAtom, step);
});
