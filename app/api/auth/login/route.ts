import { z } from "zod";
import { ApiError, handler, ok, parseBody, rateLimit } from "@/lib/api";
import { miraepass } from "@/lib/miraepass";
import { mapMiraepassError } from "@/lib/orders";
import { getSession, roleFor } from "@/lib/session";

const Body = z.object({ id: z.coerce.number().int().positive(), password: z.string().min(1).max(100) });

export const POST = handler(async (req) => {
  const { id, password } = await parseBody(req, Body);
  rateLimit(`login:${id}`, 10, 60_000);
  let user;
  try {
    user = await miraepass().verifyCredentials(id, password);
  } catch (e) {
    throw mapMiraepassError(e);
  }
  const role = roleFor(user.id);
  if (!role) throw new ApiError("FORBIDDEN", "카페 관리 권한이 없는 계정이에요", 403);
  const session = await getSession();
  session.user = { id: user.id, name: user.name, role };
  await session.save();
  return ok(session.user);
});
