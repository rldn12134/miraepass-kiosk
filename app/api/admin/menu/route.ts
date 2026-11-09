import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { MenuItemBody, saveMenuItem } from "@/lib/admin-menu";
import { getMenuTree } from "@/lib/menu";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireUser("staff");
  return ok(getMenuTree({ includeHidden: true }));
});

export const POST = handler(async (req) => {
  await requireUser("admin");
  const id = saveMenuItem(await parseBody(req, MenuItemBody));
  return ok({ id }, { status: 201 });
});
