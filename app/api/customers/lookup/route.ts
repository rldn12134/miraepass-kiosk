import { z } from "zod";
import { ApiError, handler, ok, parseBody, rateLimit, requireKiosk } from "@/lib/api";
import { miraepass, type MPUser } from "@/lib/miraepass";
import { mapMiraepassError } from "@/lib/orders";
import { maskName } from "@/lib/format";
import type { CustomerCandidate } from "@/lib/types";

const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("student"), studentId: z.coerce.number().int().min(1000).max(99999), amount: z.number().int().min(0) }),
  z.object({ type: z.literal("teacher"), name: z.string().trim().min(1).max(20), amount: z.number().int().min(0) }),
]);

const toCandidate = (u: MPUser, amount: number, mask: boolean): CustomerCandidate => ({
  id: u.id,
  type: u.type === "teacher" ? "teacher" : "student",
  displayName: mask ? maskName(u.name) : u.name,
  grade: u.grade,
  classNo: u.classNo,
  sufficient: u.point === null ? null : u.point >= amount,
});

export const POST = handler(async (req) => {
  const token = requireKiosk(req);
  rateLimit(`lookup:${token}`, 30, 60_000);
  const body = await parseBody(req, Body);
  const gateway = miraepass();
  try {
    if (body.type === "student") {
      const user = await gateway.findStudent(body.studentId);
      if (!user) throw new ApiError("USER_NOT_FOUND", "해당 학번의 학생을 찾을 수 없어요", 404);
      return ok([toCandidate(user, body.amount, true)]);
    }
    const list = await gateway.searchTeachers(body.name);
    if (list.length === 0) throw new ApiError("USER_NOT_FOUND", "해당 이름의 선생님을 찾을 수 없어요", 404);
    // 교사는 동명이인 구분을 위해 이름 전체를 보여준다 (검색어를 직접 입력한 본인)
    return ok(list.slice(0, 10).map((u) => toCandidate(u, body.amount, false)));
  } catch (e) {
    throw mapMiraepassError(e);
  }
});
