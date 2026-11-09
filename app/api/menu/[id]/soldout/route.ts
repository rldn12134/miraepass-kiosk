import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, handler, idParam, ok, parseBody, requireUser } from "@/lib/api";
import { db, schema } from "@/lib/db";
import { emit } from "@/lib/realtime";

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  await requireUser("staff");
  const id = idParam((await params).id);
  const { soldOut } = await parseBody(req, z.object({ soldOut: z.boolean() }));
  const row = db.update(schema.menuItems).set({ isSoldOut: soldOut }).where(eq(schema.menuItems.id, id)).returning().get();
  if (!row) throw new ApiError("NOT_FOUND", "메뉴를 찾을 수 없어요", 404);
  emit(["kiosk", "staff", "admin"], "menu:changed");
  return ok({ id, soldOut });
});
