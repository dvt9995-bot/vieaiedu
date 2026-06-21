import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { generateCoverImage, type CoverStyle } from "@/lib/gemini";

export const maxDuration = 60;

const STYLES = ["modern", "tech3d", "gradient", "photo", "flat"];
const ROLES = ["product", "person", "platform"];

// Sinh ảnh bìa khóa học bằng AI (Nano Banana 2) → trả base64 (app sẽ vẽ chữ/ lưu sau).
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { title, refs, style, withText } = await req.json().catch(() => ({}));
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Cần nhập tên khóa học trước" }, { status: 400 });

  const refList = Array.isArray(refs)
    ? refs.filter((r) => r && typeof r.data === "string" && typeof r.mime === "string" && r.mime.startsWith("image/"))
        .slice(0, 3)
        .map((r) => ({ data: r.data, mime: r.mime, role: ROLES.includes(r.role) ? r.role : "product" }))
    : [];

  const img = await generateCoverImage(String(title).trim(), refList, {
    style: (STYLES.includes(style) ? style : "modern") as CoverStyle,
    withText: withText !== false,
  });
  if (!img) return NextResponse.json({ error: "AI chưa tạo được ảnh (kiểm tra Gemini key / hạn mức)" }, { status: 502 });

  return NextResponse.json({ ok: true, dataUrl: `data:${img.mime};base64,${img.data}` });
}
