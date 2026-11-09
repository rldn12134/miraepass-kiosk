import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { CategoryBody, notifyMenuChanged } from "@/lib/admin-menu";
import { db, schema } from "@/lib/db";

export const POST = handler(async (req) => {
  await requireUser("admin");
  const body = await parseBody(req, CategoryBody);
  const row = db.insert(schema.categories).values(body).returning().get();
  notifyMenuChanged();
  return ok(row, { status: 201 });
});
