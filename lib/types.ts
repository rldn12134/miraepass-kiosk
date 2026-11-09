/** 클라이언트·서버가 함께 쓰는 DTO 타입 (DB 의존성 없음) */

export type CustomerType = "student" | "teacher";

export type OrderStatus =
  | "pending_payment"
  | "failed"
  | "received"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded" | "refund_failed";

export type MenuOptionItemDTO = {
  id: number;
  name: string;
  extraPrice: number;
  isDefault: boolean;
};

export type MenuOptionGroupDTO = {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  items: MenuOptionItemDTO[];
};

export type MenuItemDTO = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isSoldOut: boolean;
  badge: "NEW" | "BEST" | null;
  sort: number;
  optionGroups: MenuOptionGroupDTO[];
};

export type CategoryDTO = {
  id: number;
  name: string;
  emoji: string;
  sort: number;
  isActive: boolean;
  items: MenuItemDTO[];
};

export type OptionSnapshot = { group: string; item: string; extra: number };

export type OrderItemDTO = {
  id: number;
  menuItemId: number | null;
  name: string;
  unitPrice: number;
  quantity: number;
  options: OptionSnapshot[];
};

export type OrderDTO = {
  id: number;
  /** 결제 실패 주문은 0 */
  orderNo: number;
  businessDate: string;
  customerType: CustomerType;
  customerId: number;
  customerName: string;
  customerGrade: number | null;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  balanceAfter: number | null;
  failReason: string | null;
  cancelReason: string | null;
  createdAt: string;
  paidAt: string | null;
  acceptedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItemDTO[];
};

export type CustomerCandidate = {
  id: number;
  type: CustomerType;
  displayName: string;
  grade: number | null;
  classNo: number | null;
  /** 잔액 조회가 불가능하면 null */
  sufficient: boolean | null;
};

export type CartLineInput = {
  menuItemId: number;
  quantity: number;
  optionItemIds: number[];
};

export type CreateOrderInput = {
  idempotencyKey: string;
  customer: { type: CustomerType; id: number };
  items: CartLineInput[];
  expectedTotal: number;
};

export type CreateOrderResult = {
  orderId: number;
  orderNo: number;
  total: number;
  balanceAfter: number | null;
};

export type DayHours = { open: string; close: string; closed: boolean };

export type StoreHours = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayHours>;

export type VoiceSettings = {
  newOrder: string;
  callStudent: string;
  callTeacher: string;
  rate: number;
};

export type KioskSettings = {
  idleSeconds: number;
  doneSeconds: number;
  shufflePinPad: boolean;
};

export type ManualClosed = { closed: boolean; message: string };

export type AppSettings = {
  storeHours: StoreHours;
  manualClosed: ManualClosed;
  voice: VoiceSettings;
  kiosk: KioskSettings;
};

export type StoreStatus = {
  open: boolean;
  reason: "open" | "manual" | "hours" | "holiday";
  message: string;
  todayHours: DayHours | null;
  nextOpenAt: string | null;
};

export type SessionUser = {
  id: number;
  name: string;
  role: "admin" | "staff";
};

export type ApiErrorCode =
  | "INSUFFICIENT_POINT"
  | "USER_NOT_FOUND"
  | "STORE_CLOSED"
  | "ITEM_SOLD_OUT"
  | "ITEM_UNAVAILABLE"
  | "INVALID_OPTIONS"
  | "PRICE_CHANGED"
  | "PAYMENT_UNAVAILABLE"
  | "INVALID_TRANSITION"
  | "REFUND_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "INTERNAL";

export type OrderCallPayload = {
  orderId: number;
  orderNo: number;
  customerName: string;
  customerType: CustomerType;
  grade: number | null;
  menu: string;
};

export type ServerToClientEvents = {
  "order:new": (order: OrderDTO) => void;
  "order:updated": (order: OrderDTO) => void;
  "order:call": (payload: OrderCallPayload) => void;
  "menu:changed": () => void;
  "store:changed": (status: StoreStatus) => void;
  "settings:changed": () => void;
};

export type ClientToServerEvents = Record<string, never>;

export type StatsResponse = {
  range: { from: string; to: string };
  kpi: {
    revenue: number;
    orders: number;
    avgTicket: number;
    cancelled: number;
    refundFailed: number;
  };
  daily: { date: string; revenue: number; orders: number }[];
  hourly: { hour: number; orders: number }[];
  topMenus: { name: string; quantity: number; revenue: number }[];
  customerMix: { type: CustomerType; orders: number; revenue: number }[];
};
