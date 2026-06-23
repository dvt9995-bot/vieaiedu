import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInstructor, ownsCourse } from "@/lib/instructor-guard";
import { parseVideoRef } from "@/lib/video";
import { getYouTubeStats } from "@/lib/youtube";

const FIELDS = ["title", "type", "duration_sec", "is_preview", "video_id", "content", "position", "section_id"];
function pick(b: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const f of FIELDS) if (b[f] !== undefined) o[f] = b[f];
  if (o.duration_sec !== undefined) o.duration_sec = Number(o.duration_sec) || 0;
  return o;
}

async function recompute(admin: NonNullable<ReturnType<typeof createAdminClient>>, courseId?: string | null) {
  if (!courseId) return;
  const { data } = await admin.from("lessons").select("duration_sec").eq("course_id", courseId);
  const sec = (data || []).reduce((n, l) => n + (Number(l.duration_sec) || 0), 0);
  await admin.from("courses").update({ total_minutes: Math.round(sec / 60) }).eq("id", courseId);
}
async function autoDuration(admin: NonNullable<ReturnType<typeof createAdminClient>>, lessonId: string, videoId: unknown) {
  const ref = parseVideoRef(typeof videoId === "string" ? videoId : null);
  if (ref?.kind !== "youtube") return;
  const st = await getYouTubeStats(ref.id);
  if (st && st.durationSec > 0) await admin.from("lessons").update({ duration_sec: st.durationSec }).eq("id", lessonId);
}
async function lessonCourse(admin: NonNullable<ReturnType<typeof createAdminClient>>, id: string) {
  const { data } = await admin.from("lessons").select("course_id").eq("id", id).maybeSingle();
  return data?.course_id as string | undefined;
}

export async function GET(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const courseId = new URL(req.url).searchParams.get("course_id");
  if (!courseId || !(await ownsCourse(courseId, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data } = await admin.from("sections").select("id, title, position, lessons(id, title, type, duration_sec, is_preview, video_id, content, position)").eq("course_id", courseId).order("position");
  const sections = (data || []).map((s) => ({ ...s, lessons: ((s.lessons as Record<string, unknown>[]) || []).slice().sort((a, b) => (a.position as number) - (b.position as number)) }));
  return NextResponse.json({ sections });
}

export async function POST(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const body = await req.json();
  if (!body.section_id || !body.course_id || !body.title) return NextResponse.json({ error: "Thiếu dữ liệu" }, { status: 400 });
  if (!(await ownsCourse(body.course_id, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { data, error } = await admin.from("lessons").insert({ course_id: body.course_id, ...pick(body) }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await autoDuration(admin, data.id, body.video_id);
  await recompute(admin, body.course_id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const courseId = await lessonCourse(admin, body.id);
  if (!courseId || !(await ownsCourse(courseId, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { error } = await admin.from("lessons").update(pick(body)).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (typeof body.video_id === "string" && body.video_id.startsWith("yt:")) await autoDuration(admin, body.id, body.video_id);
  await recompute(admin, courseId);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const courseId = await lessonCourse(admin, id);
  if (!courseId || !(await ownsCourse(courseId, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { error } = await admin.from("lessons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recompute(admin, courseId);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}
