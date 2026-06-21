import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { suggestCourseSubtitle, suggestCourseDescription } from "@/lib/gemini";

export const maxDuration = 30;

// Gợi ý mô tả cho khóa học bằng AI. field = "subtitle" (mặc định) hoặc "description".
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { title, field } = await req.json().catch(() => ({}));
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Cần nhập tên khóa học trước" }, { status: 400 });
  const t = String(title).trim();
  if (field === "description") {
    const description = await suggestCourseDescription(t);
    if (!description) return NextResponse.json({ error: "AI chưa gợi ý được (kiểm tra Gemini key)" }, { status: 502 });
    return NextResponse.json({ ok: true, description });
  }
  const subtitle = await suggestCourseSubtitle(t);
  if (!subtitle) return NextResponse.json({ error: "AI chưa gợi ý được (kiểm tra Gemini key)" }, { status: 502 });
  return NextResponse.json({ ok: true, subtitle });
}
