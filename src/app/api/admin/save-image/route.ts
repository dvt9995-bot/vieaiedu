import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

export const maxDuration = 30;

// Lưu 1 ảnh base64 (data URL) vào Storage → trả public URL. Dùng cho ảnh bìa AI (đã ghép chữ).
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { dataUrl } = await req.json().catch(() => ({}));
  const m = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return NextResponse.json({ error: "Ảnh không hợp lệ" }, { status: 400 });
  const mime = m[1]; const b64 = m[2];
  if (b64.length > 12_000_000) return NextResponse.json({ error: "Ảnh quá lớn" }, { status: 413 });

  const admin = createAdminClient()!;
  const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const path = `course-cover-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from("blog").upload(path, Buffer.from(b64, "base64"), { contentType: mime, upsert: true });
  if (error) return NextResponse.json({ error: "Lưu ảnh thất bại: " + error.message }, { status: 500 });
  return NextResponse.json({ ok: true, url: admin.storage.from("blog").getPublicUrl(path).data.publicUrl });
}
