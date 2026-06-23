import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInstructor, ownsCourse } from "@/lib/instructor-guard";
import { createMeetEvent, deleteMeetEvent, gcalConfigured } from "@/lib/gcal";

async function sessionCourse(admin: NonNullable<ReturnType<typeof createAdminClient>>, id: string) {
  const { data } = await admin.from("live_sessions").select("course_id, calendar_event_id").eq("id", id).maybeSingle();
  return data;
}

// Danh sách buổi của 1 khóa (giảng viên — có meet_url)
export async function GET(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const courseId = new URL(req.url).searchParams.get("course_id");
  if (!courseId || !(await ownsCourse(courseId, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data } = await admin.from("live_sessions").select("id, title, starts_at, duration_min, meet_url, recording_url, calendar_event_id").eq("course_id", courseId).order("starts_at");
  return NextResponse.json({ sessions: data ?? [], gcal: await gcalConfigured() });
}

// Tạo buổi: nếu đã kết nối Google → tự sinh link Meet; nếu chưa → dùng meet_url dán tay
export async function POST(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!b.course_id || !b.starts_at) return NextResponse.json({ error: "Thiếu khóa hoặc thời gian" }, { status: 400 });
  if (!(await ownsCourse(b.course_id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data: course } = await admin.from("courses").select("title").eq("id", b.course_id).maybeSingle();
  const duration = Number(b.duration_min) || 90;
  let meet_url: string | null = b.meet_url ? String(b.meet_url).trim() : null;
  let calendar_event_id: string | null = null;
  if (!meet_url && (await gcalConfigured())) {
    const ev = await createMeetEvent({ summary: `${course?.title || "Lớp học"}${b.title ? " — " + b.title : ""}`, description: "Buổi học trực tuyến VIE AI EDU", startISO: new Date(b.starts_at).toISOString(), durationMin: duration });
    if (ev) { meet_url = ev.meetUrl; calendar_event_id = ev.eventId; }
  }
  const { data, error } = await admin.from("live_sessions").insert({
    course_id: b.course_id, title: b.title || null, starts_at: new Date(b.starts_at).toISOString(), duration_min: duration, meet_url, calendar_event_id, position: Number(b.position) || 0,
  }).select("id, meet_url").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true, id: data.id, meet_url: data.meet_url, autoMeet: !!calendar_event_id });
}

export async function PATCH(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const sc = await sessionCourse(admin, b.id);
  if (!sc?.course_id || !(await ownsCourse(sc.course_id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const patch: Record<string, unknown> = {};
  for (const f of ["title", "meet_url", "recording_url", "duration_min"]) if (b[f] !== undefined) patch[f] = b[f];
  if (b.starts_at !== undefined) patch.starts_at = new Date(b.starts_at).toISOString();
  if (b.duration_min !== undefined) patch.duration_min = Number(b.duration_min) || 90;
  const { error } = await admin.from("live_sessions").update(patch).eq("id", b.id);
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
  const sc = await sessionCourse(admin, id);
  if (!sc?.course_id || !(await ownsCourse(sc.course_id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (sc.calendar_event_id) await deleteMeetEvent(sc.calendar_event_id as string);
  await admin.from("live_sessions").delete().eq("id", id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}
