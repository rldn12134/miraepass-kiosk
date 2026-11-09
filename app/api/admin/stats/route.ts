import { z } from "zod";
import { handler, ok, requireUser } from "@/lib/api";
import { getStats } from "@/lib/stats";
import { businessDate } from "@/lib/store-hours";

export const dynamic = "force-dynamic";
const Q = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const GET = handler(async (req) => {
  await requireUser("admin");
  const q = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const today = businessDate();
  return ok(getStats(q.from ?? today, q.to ?? today));
});
