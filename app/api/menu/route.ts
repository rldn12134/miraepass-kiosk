import { handler, ok } from "@/lib/api";
import { getMenuTree } from "@/lib/menu";

export const dynamic = "force-dynamic";
export const GET = handler(async () => ok(getMenuTree()));
