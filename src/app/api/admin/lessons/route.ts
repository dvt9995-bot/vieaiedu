import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

const FIELDS = ["title", "type", "duration_sec", "is_preview", "video_id", "content", "position", "section_id"];
function pick(b: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const f of FIELDS) if (b[f] !== undefined) o[f] = b[f];
  if (o.duration_sec !== undefined) o.duration_sec = Number(o.duration_sec) || 0;
  return o;
}

// GET ?course_id= → cấu trúc chương + bài của khóa (admin)
export async function GET(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const courseId = new URL(req.url).searchParams.get("course_id");
  const { data } = await admin
    .from("sections").select("id, title, position, lessons(id, title, type, duration_sec, is_preview, video_id, position)")
    .eq("course_id", courseId).order("position");
  const sections = (data || []).map((s) => ({
    ...s, lessons: ((s.lessons as Record<string, unknown>[]) || []).slice().sort((a, b) => (a.position as number) - (b.position as number)),
  }));
  return NextResponse.json({ sections });
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const body = await req.json();
  if (!body.section_id || !body.course_id || !body.title) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
  const { data, error } = await admin.from("lessons").insert({ course_id: body.course_id, ...pick(body) }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const { error } = await admin.from("lessons").update(pick(body)).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  const { error } = await admin.from("lessons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
