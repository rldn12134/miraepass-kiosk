import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ApiError } from "./api";
import { db, schema } from "./db";
import type { Order, OrderItem } from "./db/schema";
import { getMenuMap } from "./menu";
import { miraepass, MiraepassError } from "./miraepass";
import { lockedFor, recordFailure, recordSuccess } from "./pin-guard";
import { PricingError, priceCart } from "./pricing";
import { emit } from "./realtime";
import { getStoreStatus } from "./settings";
import { businessDate } from "./store-hours";
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderCallPayload,
  OrderDTO,
  OrderStatus,
  SessionUser,
} from "./types";

/* ------------------------------------------------------------------ */
/* 직렬화                                                              */
/* ------------------------------------------------------------------ */

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toOrderDTO(o: Order, items: OrderItem[]): OrderDTO {
  return {
    id: o.id,
    orderNo: o.orderNo ?? 0,
    businessDate: o.businessDate,
    customerType: o.customerType,
    customerId: o.customerId,
    customerName: o.customerName,
    customerGrade: o.customerGrade,
    total: o.total,
    status: o.status,
    paymentStatus: o.paymentStatus,
    balanceAfter: o.balanceAfter,
    failReason: o.failReason,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    paidAt: iso(o.paidAt),
    acceptedAt: iso(o.acceptedAt),
    readyAt: iso(o.readyAt),
    completedAt: iso(o.completedAt),
    cancelledAt: iso(o.cancelledAt),
    items: items.map((i) => ({
      id: i.id,
      menuItemId: i.menuItemId,
      name: i.nameSnapshot,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      options: i.optionsSnapshot,
    })),
  };
}

export function loadOrders(rows: Order[]): OrderDTO[] {
  if (rows.length === 0) return [];
  const items = db
    .select()
    .from(schema.orderItems)
    .where(
      inArray(
        schema.orderItems.orderId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(schema.orderItems.id))
    .all();
  const byOrder = new Map<number, OrderItem[]>();
  for (const i of items) byOrder.set(i.orderId, [...(byOrder.get(i.orderId) ?? []), i]);
  return rows.map((r) => toOrderDTO(r, byOrder.get(r.id) ?? []));
}

export function getOrder(id: number): OrderDTO {
  const row = db.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
  if (!row) throw new ApiError("NOT_FOUND", "주문을 찾을 수 없어요", 404);
  return loadOrders([row])[0];
}

export function getActiveOrders(): OrderDTO[] {
  const rows = db
    .select()
    .from(schema.orders)
    .where(inArray(schema.orders.status, ["received", "preparing", "ready"]))
    .orderBy(asc(schema.orders.createdAt))
    .all();
  return loadOrders(rows);
}

/** 오늘(KST) 처리 끝난 주문 (직원 화면 하단 목록) */
export function getTodayClosedOrders(limit = 50): OrderDTO[] {
  const rows = db
    .select()
    .from(schema.orders)
    .where(
      and(eq(schema.orders.businessDate, businessDate()), inArray(schema.orders.status, ["completed", "cancelled"])),
    )
    .orderBy(desc(sql`coalesce(${schema.orders.completedAt}, ${schema.orders.cancelledAt}, ${schema.orders.createdAt})`))
    .limit(limit)
    .all();
  return loadOrders(rows);
}

export function menuSummary(o: OrderDTO) {
  const [first, ...rest] = o.items;
  if (!first) return "";
  const count = rest.reduce((s, i) => s + i.quantity, 0) + first.quantity - 1;
  return count > 0 ? `${first.name} 외 ${count}개` : first.name;
}

export function callPayload(o: OrderDTO): OrderCallPayload {
  return {
    orderId: o.id,
    orderNo: o.orderNo,
    customerName: o.customerName,
    customerType: o.customerType,
    grade: o.customerGrade,
    menu: menuSummary(o),
  };
}

/* ------------------------------------------------------------------ */
/* 주문 생성 + 결제                                                     */
/* ------------------------------------------------------------------ */

function logAction(orderId: number | null, actor: SessionUser | null, action: string, detail?: string) {
  db.insert(schema.staffActions)
    .values({ orderId, actorId: actor?.id ?? null, actorName: actor?.name ?? "kiosk", action, detail })
    .run();
}

function failureFromStored(o: Order): ApiError {
  const code = (o.failReason as ApiError["code"]) ?? "PAYMENT_UNAVAILABLE";
  return new ApiError(code, FAIL_MESSAGES[code] ?? "결제에 실패했어요", 402);
}

const FAIL_MESSAGES: Partial<Record<ApiError["code"], string>> = {
  INSUFFICIENT_POINT: "포인트가 부족해요",
  USER_NOT_FOUND: "MIRAEPASS 사용자를 찾을 수 없어요",
  PAYMENT_UNAVAILABLE: "MIRAEPASS 결제 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요",
};

/**
 * 키오스크 주문 처리: 영업 확인 → 가격 재계산 → 고객 조회 → 결제 비밀번호 검증 → 포인트 차감 → 주문 확정.
 * 비밀번호가 틀리면 주문 행을 만들지 않으므로 같은 멱등키로 다시 시도할 수 있다.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // 1. 영업 상태
  const store = getStoreStatus();
  if (!store.open) throw new ApiError("STORE_CLOSED", store.message, 409);

  // 2. 멱등성: 같은 키로 이미 처리한 주문이면 그 결과를 그대로 돌려준다
  const existing = db.select().from(schema.orders).where(eq(schema.orders.idempotencyKey, input.idempotencyKey)).get();
  if (existing) {
    if (existing.paymentStatus === "paid" || existing.paymentStatus === "refunded") {
      return { orderId: existing.id, orderNo: existing.orderNo ?? 0, total: existing.total, balanceAfter: existing.balanceAfter };
    }
    if (existing.status === "failed") throw failureFromStored(existing);
    throw new ApiError("PAYMENT_UNAVAILABLE", "결제를 처리하고 있어요. 잠시만 기다려 주세요", 409);
  }

  // 3. 서버 기준 가격 재계산
  let priced: ReturnType<typeof priceCart>;
  try {
    priced = priceCart(getMenuMap(), input.items);
  } catch (e) {
    if (e instanceof PricingError) throw new ApiError(e.code, e.message, 409, { menuItemId: e.menuItemId });
    throw e;
  }
  if (priced.total !== input.expectedTotal) {
    throw new ApiError("PRICE_CHANGED", "메뉴 가격이 변경됐어요. 주문 내역을 다시 확인해 주세요", 409, {
      total: priced.total,
    });
  }

  // 4. 고객 조회 (학생/교사 구분, 이름·학년 스냅샷)
  const gateway = miraepass();
  let customer;
  try {
    customer = await gateway.findUser(input.customerId);
  } catch (e) {
    throw mapMiraepassError(e);
  }
  if (!customer || customer.type === "service") throw new ApiError("USER_NOT_FOUND", FAIL_MESSAGES.USER_NOT_FOUND!, 404);
  const customerType = customer.type;

  // 5. 키오스크 결제 비밀번호 검증 (연속 실패 시 잠금)
  await checkPin(customer.id, input.pin);

  // 6. 주문 저장 (pending_payment)
  const day = businessDate();
  const orderId = db.transaction((tx) => {
    const order = tx
      .insert(schema.orders)
      .values({
        businessDate: day,
        idempotencyKey: input.idempotencyKey,
        customerType,
        customerId: customer.id,
        customerName: customer.name,
        customerGrade: customer.grade,
        total: priced.total,
      })
      .returning({ id: schema.orders.id })
      .get();
    tx.insert(schema.orderItems)
      .values(
        priced.lines.map((l) => ({
          orderId: order.id,
          menuItemId: l.menuItemId,
          nameSnapshot: l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          optionsSnapshot: l.options,
        })),
      )
      .run();
    return order.id;
  });

  // 7. MIRAEPASS 차감 → 성공하면 그날의 주문번호 부여
  let balanceAfter: number | null;
  try {
    balanceAfter = await gateway.deduct(customer.id, priced.total, `교내 카페 주문 (ID ${orderId})`);
  } catch (e) {
    const err = mapMiraepassError(e);
    db.update(schema.orders)
      .set({ status: "failed", paymentStatus: "failed", failReason: err.code })
      .where(eq(schema.orders.id, orderId))
      .run();
    throw err;
  }
  const orderNo = db.transaction((tx) => {
    const { next } = tx
      .select({ next: sql<number>`coalesce(max(${schema.orders.orderNo}), 0) + 1` })
      .from(schema.orders)
      .where(eq(schema.orders.businessDate, day))
      .get()!;
    tx.update(schema.orders)
      .set({ orderNo: next, status: "received", paymentStatus: "paid", balanceAfter, paidAt: new Date() })
      .where(eq(schema.orders.id, orderId))
      .run();
    return next;
  });
  emit(["staff", "admin"], "order:new", getOrder(orderId));
  return { orderId, orderNo, total: priced.total, balanceAfter };
}

async function checkPin(customerId: number, pin: string) {
  const locked = lockedFor(customerId);
  if (locked > 0) {
    const minutes = Math.ceil(locked / 60_000);
    throw new ApiError("PIN_LOCKED", `비밀번호를 여러 번 틀려서 ${minutes}분 동안 결제할 수 없어요`, 429, { retryAfterSec: Math.ceil(locked / 1000) });
  }
  let ok: boolean;
  try {
    ok = await miraepass().verifyKioskPin(customerId, pin);
  } catch (e) {
    throw mapMiraepassError(e);
  }
  if (ok) return recordSuccess(customerId);
  const remaining = recordFailure(customerId);
  if (remaining === 0) {
    throw new ApiError("PIN_LOCKED", "비밀번호를 여러 번 틀려서 10분 동안 결제할 수 없어요", 429, { retryAfterSec: 600 });
  }
  throw new ApiError("INVALID_PIN", `비밀번호가 맞지 않아요 (${remaining}번 더 시도할 수 있어요)`, 401, { remainingAttempts: remaining });
}

export function mapMiraepassError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (e instanceof MiraepassError) {
    switch (e.code) {
      case "INSUFFICIENT_POINT":
        return new ApiError("INSUFFICIENT_POINT", FAIL_MESSAGES.INSUFFICIENT_POINT!, 402);
      case "USER_NOT_FOUND":
        return new ApiError("USER_NOT_FOUND", FAIL_MESSAGES.USER_NOT_FOUND!, 404);
      case "LIMIT_EXCEEDED":
        return new ApiError("REFUND_FAILED", "MIRAEPASS 지급 한도를 초과했어요", 429);
      case "INVALID_CREDENTIALS":
        return new ApiError("INVALID_CREDENTIALS", "ID 또는 비밀번호가 일치하지 않아요", 401);
      case "FORBIDDEN":
        // 키오스크 서비스 계정 권한(DEDUCT_POINT/GRANT_POINT) 설정 문제: 고객이 아니라 운영자가 고쳐야 한다
        console.error("[miraepass] 서비스 계정 권한 부족", e.status, e.message);
        return new ApiError("PAYMENT_UNAVAILABLE", "키오스크 결제 계정의 권한 설정이 필요해요. 카페 관리자에게 알려 주세요", 503);
      case "PIN_NOT_SET":
        return new ApiError("PIN_NOT_SET", "키오스크 비밀번호가 설정되지 않았어요. MIRAEPASS에서 먼저 설정해 주세요", 409);
      default:
        console.error("[miraepass]", e.code, e.status, e.message);
        return new ApiError("PAYMENT_UNAVAILABLE", FAIL_MESSAGES.PAYMENT_UNAVAILABLE!, 503);
    }
  }
  console.error("[miraepass] unexpected", e);
  return new ApiError("PAYMENT_UNAVAILABLE", FAIL_MESSAGES.PAYMENT_UNAVAILABLE!, 503);
}

/* ------------------------------------------------------------------ */
/* 상태 전이                                                           */
/* ------------------------------------------------------------------ */

export type OrderAction = "accept" | "ready" | "complete" | "cancel";

export const TRANSITIONS: Record<OrderAction, { from: OrderStatus[]; to: OrderStatus }> = {
  accept: { from: ["received"], to: "preparing" },
  ready: { from: ["received", "preparing"], to: "ready" },
  complete: { from: ["ready"], to: "completed" },
  cancel: { from: ["received", "preparing", "ready"], to: "cancelled" },
};

export function canTransition(status: OrderStatus, action: OrderAction) {
  return TRANSITIONS[action].from.includes(status);
}

export async function transitionOrder(
  id: number,
  action: OrderAction,
  actor: SessionUser,
  reason?: string,
): Promise<{ order: OrderDTO; refundError?: string }> {
  const current = db.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
  if (!current) throw new ApiError("NOT_FOUND", "주문을 찾을 수 없어요", 404);
  if (!canTransition(current.status, action)) {
    throw new ApiError("INVALID_TRANSITION", "이미 처리된 주문이에요", 409);
  }

  const now = new Date();
  const to = TRANSITIONS[action].to;
  // 동시 처리 방지: 현재 상태가 그대로일 때만 갱신
  const updated = db
    .update(schema.orders)
    .set({
      status: to,
      ...(action === "accept" && { acceptedAt: now }),
      ...(action === "ready" && { readyAt: now, acceptedAt: current.acceptedAt ?? now }),
      ...(action === "complete" && { completedAt: now }),
      ...(action === "cancel" && { cancelledAt: now, cancelReason: reason ?? null }),
    })
    .where(and(eq(schema.orders.id, id), eq(schema.orders.status, current.status)))
    .returning({ id: schema.orders.id })
    .all();
  if (updated.length === 0) throw new ApiError("INVALID_TRANSITION", "다른 기기에서 먼저 처리했어요", 409);
  logAction(id, actor, action, reason);

  let refundError: string | undefined;
  if (action === "cancel" && current.paymentStatus === "paid") {
    refundError = await refundOrder(id, actor);
  }

  const order = getOrder(id);
  emit(["staff", "admin"], "order:updated", order);
  if (action === "ready") emit("staff", "order:call", callPayload(order));
  return { order, refundError };
}

/** 환불 실행. 실패해도 예외를 던지지 않고 refund_failed로 표시한 뒤 메시지를 반환 */
export async function refundOrder(id: number, actor: SessionUser): Promise<string | undefined> {
  const o = db.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
  if (!o) throw new ApiError("NOT_FOUND", "주문을 찾을 수 없어요", 404);
  if (o.paymentStatus !== "paid" && o.paymentStatus !== "refund_failed") {
    throw new ApiError("INVALID_TRANSITION", "환불할 수 없는 주문이에요", 409);
  }
  try {
    await miraepass().grant(o.customerId, o.total, `교내 카페 주문 #${o.orderNo} (ID ${o.id}) 환불`);
    db.update(schema.orders).set({ paymentStatus: "refunded" }).where(eq(schema.orders.id, id)).run();
    logAction(id, actor, "refund");
    return undefined;
  } catch (e) {
    const err = mapMiraepassError(e);
    db.update(schema.orders).set({ paymentStatus: "refund_failed" }).where(eq(schema.orders.id, id)).run();
    logAction(id, actor, "refund_failed", err.message);
    return err.message;
  }
}

export async function retryRefund(id: number, actor: SessionUser) {
  const error = await refundOrder(id, actor);
  const order = getOrder(id);
  emit(["staff", "admin"], "order:updated", order);
  if (error) throw new ApiError("REFUND_FAILED", error, 502);
  return order;
}

export function recallOrder(id: number, actor: SessionUser) {
  const order = getOrder(id);
  if (order.status !== "ready") throw new ApiError("INVALID_TRANSITION", "픽업 대기 중인 주문만 호출할 수 있어요", 409);
  logAction(id, actor, "recall");
  emit("staff", "order:call", callPayload(order));
  return order;
}

export function getOrderActions(id: number) {
  return db
    .select()
    .from(schema.staffActions)
    .where(eq(schema.staffActions.orderId, id))
    .orderBy(asc(schema.staffActions.createdAt))
    .all()
    .map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }));
}
