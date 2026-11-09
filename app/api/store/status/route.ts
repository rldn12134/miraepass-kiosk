import { handler, ok } from "@/lib/api";
import { getStoreStatus } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const GET = handler(async () => ok(getStoreStatus()));
