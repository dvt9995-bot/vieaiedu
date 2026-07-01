import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/shop";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCoverImage, type CoverStyle } from "@/lib/gemini";

export const maxDuration = 60;
const STYLES = ["modern", "tech3d", "gradient", "photo", "flat"];

// Sinh ẢNH SẢN PHẨM bằng AI → upload bucket public → trả URL để thêm vào thư viện ảnh.
export async function POST(req: Request) {
  const u = await requireSeller();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { title, style } = await req.json().catch(() => ({}));
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Nhập tên sản phẩm trước" }, { status: 400 });

  const img = await generateCoverImage(`Sản phẩm: ${String(title).trim()}`, [], { style: (STYLES.includes(style) ? style : "tech3d") as CoverStyle, withText: false });
  if (!img) return NextResponse.json({ error: "AI chưa tạo được ảnh (kiểm tra Gemini key / hạn mức)" }, { status: 502 });

  const admin = createAdminClient()!;
  const ext = img.mime.includes("png") ? "png" : img.mime.includes("webp") ? "webp" : "jpg";
  const path = `shop-ai/${u.shopId}/${globalThis.crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(img.data, "base64");
  const { error } = await admin.storage.from("blog").upload(path, buf, { contentType: img.mime, upsert: false });
  if (error) return NextResponse.json({ error: "Lưu ảnh lỗi: " + error.message }, { status: 500 });
  const { data: pub } = admin.storage.from("blog").getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}
