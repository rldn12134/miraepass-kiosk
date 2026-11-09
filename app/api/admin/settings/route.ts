import { z } from "zod";
import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { emit } from "@/lib/realtime";
import { getSettings, getStoreStatus, updateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Day = z.object({ open: hhmm, close: hhmm, closed: z.boolean() }).refine((d) => d.closed || d.open < d.close, {
  message: "마감 시간은 오픈 시간보다 늦어야 해요",
});
const Body = z.object({
  storeHours: z.object({ "0": Day, "1": Day, "2": Day, "3": Day, "4": Day, "5": Day, "6": Day }).optional(),
  manualClosed: z.object({ closed: z.boolean(), message: z.string().max(60) }).optional(),
  voice: z
    .object({
      newOrder: z.string().max(100),
      callStudent: z.string().max(100),
      callTeacher: z.string().max(100),
      rate: z.number().min(0.5).max(2),
    })
    .optional(),
  kiosk: z
    .object({
      idleSeconds: z.number().int().min(15).max(600),
      doneSeconds: z.number().int().min(3).max(60),
      shufflePinPad: z.boolean(),
    })
    .optional(),
});

export const GET = handler(async () => {
  await requireUser("admin");
  return ok({ settings: getSettings(), status: getStoreStatus(), kioskToken: process.env.KIOSK_DEVICE_TOKEN ?? "" });
});

export const PUT = handler(async (req) => {
  await requireUser("admin");
  const patch = await parseBody(req, Body);
  const settings = updateSettings(patch);
  const status = getStoreStatus();
  emit(["kiosk", "staff", "admin"], "store:changed", status);
  emit(["kiosk", "staff", "admin"], "settings:changed");
  return ok({ settings, status });
});
