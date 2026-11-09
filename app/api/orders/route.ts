import { z } from "zod";
import { handler, ok, parseBody, requireKiosk } from "@/lib/api";
import { createOrder } from "@/lib/orders";

const Body = z.object({
  idempotencyKey: z.string().min(8).max(64),
  customer: z.object({
    type: z.enum(["student", "teacher"]),
    id: z.number().int().positive(),
    name: z.string().max(20).optional(),
  }),
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
  requireKiosk(req);
  const body = await parseBody(req, Body);
  const result = await createOrder({ ...body, customerName: body.customer.name });
  return ok(result, { status: 201 });
});
