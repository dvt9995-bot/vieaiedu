import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { suggestCourseSubtitle } from "@/lib/gemini";

export const maxDuration = 30;

// Gợi ý mô tả ngắn cho khóa học bằng AI dựa trên tên.
export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { title } = await req.json().catch(() => ({}));
  if (!title || !String(title).trim()) return NextResponse.json({ error: "Cần nhập tên khóa học trước" }, { status: 400 });
  const subtitle = await suggestCourseSubtitle(String(title).trim());
  if (!subtitle) return NextResponse.json({ error: "AI chưa gợi ý được (kiểm tra Gemini key)" }, { status: 502 });
  return NextResponse.json({ ok: true, subtitle });
}
