import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { generateCoverImage } from "@/lib/gemini";

export const maxDuration = 60;

// Sinh ảnh bìa khóa học bằng AI (Gemini Nano Banana Pro) dựa trên tên khóa → lưu Storage → trả URL.
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { title, refs } = await req.json().catch(() => ({}));
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Cần nhập tên khóa học trước" }, { status: 400 });

  // Ảnh tham chiếu (tùy chọn, tối đa 3) — chỉ nhận base64 hợp lệ
  const refList = Array.isArray(refs)
    ? refs.filter((r) => r && typeof r.data === "string" && typeof r.mime === "string" && r.mime.startsWith("image/")).slice(0, 3)
    : [];

  const img = await generateCoverImage(String(title).trim(), refList);
  if (!img) return NextResponse.json({ error: "AI chưa tạo được ảnh (kiểm tra Gemini key / hạn mức)" }, { status: 502 });

  const admin = createAdminClient()!;
  const ext = img.mime.includes("jpeg") ? "jpg" : "png";
  const path = `course-cover-${Date.now()}.${ext}`;
  const buf = Buffer.from(img.data, "base64");
  const { error } = await admin.storage.from("blog").upload(path, buf, { contentType: img.mime, upsert: true });
  if (error) return NextResponse.json({ error: "Lưu ảnh thất bại: " + error.message }, { status: 500 });
  const url = admin.storage.from("blog").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, url });
}
