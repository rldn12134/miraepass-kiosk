import { z } from "zod";
import { handler, ok, parseBody, rateLimit, requireKiosk } from "@/lib/api";
import { createOrder } from "@/lib/orders";

const Body = z.object({
  idempotencyKey: z.string().min(8).max(64),
  customerId: z.number().int().min(1000).max(9999),
  pin: z.string().regex(/^\d{6}$/, "결제 비밀번호는 6자리 숫자예요"),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(20),
        optionItemIds: z.array(z.number().int().positive()).max(20),
      }),
    )
    .min(1)
    .max(30),
  expectedTotal: z.number().int().min(0),
});

export const POST = handler(async (req) => {
  const token = requireKiosk(req);
  rateLimit(`order:${token}`, 30, 60_000);
  const body = await parseBody(req, Body);
  return ok(await createOrder(body), { status: 201 });
});
