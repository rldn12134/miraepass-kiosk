import { z } from "zod";
import { handler, idParam, ok, parseBody, requireUser } from "@/lib/api";
import { transitionOrder } from "@/lib/orders";

const Body = z.object({
  action: z.enum(["accept", "ready", "complete", "cancel"]),
  reason: z.string().max(100).optional(),
});

export const PATCH = handler<{ id: string }>(async (req, { params }) => {
  const user = await requireUser("staff");
  const id = idParam((await params).id);
  const { action, reason } = await parseBody(req, Body);
  return ok(await transitionOrder(id, action, user, reason));
});
