export const qk = {
  menu: ["menu"] as const,
  adminMenu: ["admin", "menu"] as const,
  storeStatus: ["store-status"] as const,
  publicSettings: ["settings", "public"] as const,
  adminSettings: ["admin", "settings"] as const,
  me: ["me"] as const,
  activeOrders: ["orders", "active"] as const,
  adminOrders: (params: Record<string, unknown>) => ["admin", "orders", params] as const,
  adminOrder: (id: number) => ["admin", "order", id] as const,
  stats: (from: string, to: string) => ["admin", "stats", from, to] as const,
};
