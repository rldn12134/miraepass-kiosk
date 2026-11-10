import { z } from "zod";
import { ApiError, handler, ok, parseBody, rateLimit, requireKiosk } from "@/lib/api";
import { maskName } from "@/lib/format";
import { miraepass } from "@/lib/miraepass";
import { mapMiraepassError } from "@/lib/orders";
import type { CustomerCandidate } from "@/lib/types";

/** MIRAEPASS ID 4자리: 학생은 학번(3학년 4반 12번 → 3412), 교사는 고유 번호 */
const Body = z.object({
  id: z.coerce.number().int().min(1000).max(9999),
  amount: z.number().int().min(0),
});

export const POST = handler(async (req) => {
  const token = requireKiosk(req);
  rateLimit(`lookup:${token}`, 30, 60_000);
  const { id, amount } = await parseBody(req, Body);
  let user;
  try {
    user = await miraepass().findUser(id);
  } catch (e) {
    throw mapMiraepassError(e);
  }
  if (!user || user.type === "service") throw new ApiError("USER_NOT_FOUND", "해당 ID의 사용자를 찾을 수 없어요", 404);

  const candidate: CustomerCandidate = {
    id: user.id,
    type: user.type,
    // 공용 기기이므로 이름은 가운데를 가리고, 잔액은 숫자 대신 충분/부족만 알려준다
    displayName: maskName(user.name),
    grade: user.grade,
    classNo: user.classNo,
    sufficient: user.point === null ? null : user.point >= amount,
  };
  return ok(candidate);
});
