import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInstructor, ownsCourse } from "@/lib/instructor-guard";

// Đánh giá nổi bật của khóa (admin hoặc giảng viên sở hữu nhập tay)
export async function GET(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const courseId = new URL(req.url).searchParams.get("course_id");
  if (!courseId || !(await ownsCourse(courseId, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("course_testimonials").select("id, name, avatar_url, role, content, rating, position").eq("course_id", courseId).order("position");
  return NextResponse.json({ testimonials: data ?? [] });
}

export async function POST(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const b = await req.json();
  if (!b.course_id || !(await ownsCourse(b.course_id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!String(b.name || "").trim() || !String(b.content || "").trim()) return NextResponse.json({ error: "Thiếu tên hoặc nội dung" }, { status: 400 });
  const admin = createAdminClient()!;
  const { error } = await admin.from("course_testimonials").insert({
    course_id: b.course_id, name: String(b.name).trim(), content: String(b.content).trim(),
    avatar_url: b.avatar_url || null, role: b.role || null, rating: Math.min(5, Math.max(1, Number(b.rating) || 5)), position: Number(b.position) || 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const { data: row } = await admin.from("course_testimonials").select("course_id").eq("id", id).maybeSingle();
  if (!row?.course_id || !(await ownsCourse(row.course_id as string, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await admin.from("course_testimonials").delete().eq("id", id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}
