import { NextResponse } from "next/server";
import { requireInstructor } from "@/lib/instructor-guard";
import { suggestCourseSubtitle, suggestCourseDescription, beautifyCourseDescription } from "@/lib/gemini";

export const maxDuration = 30;

// Gợi ý / viết / làm đẹp mô tả khóa học bằng AI (giảng viên). field = subtitle | description | beautify.
export async function POST(req: Request) {
  if (!(await requireInstructor())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { title, field, text } = await req.json().catch(() => ({}));
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Cần nhập tên khóa học trước" }, { status: 400 });
  const t = String(title).trim();
  if (field === "beautify") {
    if (!text || !String(text).trim()) return NextResponse.json({ error: "Chưa có nội dung để làm đẹp" }, { status: 400 });
    const description = await beautifyCourseDescription(t, String(text));
    if (!description) return NextResponse.json({ error: "AI chưa xử lý được" }, { status: 502 });
    return NextResponse.json({ ok: true, description });
  }
  if (field === "description") {
    const description = await suggestCourseDescription(t);
    if (!description) return NextResponse.json({ error: "AI chưa gợi ý được" }, { status: 502 });
    return NextResponse.json({ ok: true, description });
  }
  const subtitle = await suggestCourseSubtitle(t);
  if (!subtitle) return NextResponse.json({ error: "AI chưa gợi ý được" }, { status: 502 });
  return NextResponse.json({ ok: true, subtitle });
}
