import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ApiError, handler, ok, requireUser } from "@/lib/api";

const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MAX = 5 * 1024 * 1024;

export const POST = handler(async (req) => {
  await requireUser("admin");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("VALIDATION", "이미지 파일이 필요해요", 400);
  const ext = TYPES[file.type];
  if (!ext) throw new ApiError("VALIDATION", "PNG, JPG, WEBP, GIF만 올릴 수 있어요", 400);
  if (file.size > MAX) throw new ApiError("VALIDATION", "5MB 이하 이미지만 올릴 수 있어요", 400);
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "data/uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return ok({ url: `/uploads/${name}` }, { status: 201 });
});
