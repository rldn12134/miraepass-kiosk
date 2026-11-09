import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("☕"),
  sort: integer("sort").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const menuItems = sqliteTable(
  "menu_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    price: integer("price").notNull(),
    imageUrl: text("image_url"),
    isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
    isSoldOut: integer("is_sold_out", { mode: "boolean" }).notNull().default(false),
    badge: text("badge", { enum: ["NEW", "BEST"] }),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("menu_items_category_idx").on(t.categoryId)],
);

export const optionGroups = sqliteTable("option_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  menuItemId: integer("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  required: integer("required", { mode: "boolean" }).notNull().default(false),
  minSelect: integer("min_select").notNull().default(0),
  maxSelect: integer("max_select").notNull().default(1),
  sort: integer("sort").notNull().default(0),
});

export const optionItems = sqliteTable("option_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id")
    .notNull()
    .references(() => optionGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  extraPrice: integer("extra_price").notNull().default(0),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  sort: integer("sort").notNull().default(0),
});

export const ORDER_STATUSES = [
  "pending_payment",
  "failed",
  "received",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export const PAYMENT_STATUSES = ["unpaid", "paid", "failed", "refunded", "refund_failed"] as const;

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderNo: integer("order_no").notNull(),
    businessDate: text("business_date").notNull(), // YYYY-MM-DD (KST)
    idempotencyKey: text("idempotency_key").notNull(),
    customerType: text("customer_type", { enum: ["student", "teacher"] }).notNull(),
    customerId: integer("customer_id").notNull(),
    customerName: text("customer_name").notNull(),
    customerGrade: integer("customer_grade"),
    total: integer("total").notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending_payment"),
    paymentStatus: text("payment_status", { enum: PAYMENT_STATUSES }).notNull().default("unpaid"),
    balanceAfter: integer("balance_after"),
    failReason: text("fail_reason"),
    cancelReason: text("cancel_reason"),
    createdAt: createdAt(),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    readyAt: integer("ready_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("orders_idempotency_idx").on(t.idempotencyKey),
    uniqueIndex("orders_daily_no_idx").on(t.businessDate, t.orderNo),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

export type OptionSnapshot = { group: string; item: string; extra: number };

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: integer("menu_item_id"),
    nameSnapshot: text("name_snapshot").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    optionsSnapshot: text("options_snapshot", { mode: "json" }).$type<OptionSnapshot[]>().notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});

export const staffActions = sqliteTable("staff_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  actorId: integer("actor_id"),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  detail: text("detail"),
  createdAt: createdAt(),
});

export type Category = typeof categories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type OptionGroup = typeof optionGroups.$inferSelect;
export type OptionItem = typeof optionItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
