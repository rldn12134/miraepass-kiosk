import { eq } from "drizzle-orm";
import { handler, idParam, ok, parseBody, requireUser } from "@/lib/api";
import { MenuItemBody, notifyMenuChanged, saveMenuItem } from "@/lib/admin-menu";
import { db, schema } from "@/lib/db";

export const PUT = handler<{ id: string }>(async (req, { params }) => {
  await requireUser("admin");
  const id = idParam((await params).id);
  saveMenuItem(await parseBody(req, MenuItemBody), id);
  return ok({ id });
});

export const DELETE = handler<{ id: string }>(async (_req, { params }) => {
  await requireUser("admin");
  const id = idParam((await params).id);
  db.delete(schema.menuItems).where(eq(schema.menuItems.id, id)).run();
  notifyMenuChanged();
  return ok(null);
});
