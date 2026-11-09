import { eq } from "drizzle-orm";
import { ApiError, handler, idParam, ok, parseBody, requireUser } from "@/lib/api";
import { CategoryBody, notifyMenuChanged } from "@/lib/admin-menu";
import { db, schema } from "@/lib/db";

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  await requireUser("admin");
  const id = idParam((await params).id);
  const body = await parseBody(req, CategoryBody.partial());
  const row = db.update(schema.categories).set(body).where(eq(schema.categories.id, id)).returning().get();
  if (!row) throw new ApiError("NOT_FOUND", "카테고리를 찾을 수 없어요", 404);
  notifyMenuChanged();
  return ok(row);
});

export const DELETE = handler<{ id: string }>(async (_req, { params }) => {
  await requireUser("admin");
  const id = idParam((await params).id);
  const count = db.select({ id: schema.menuItems.id }).from(schema.menuItems).where(eq(schema.menuItems.categoryId, id)).all().length;
  if (count > 0) throw new ApiError("VALIDATION", "메뉴가 남아 있는 카테고리는 삭제할 수 없어요", 409);
  db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
  notifyMenuChanged();
  return ok(null);
});
