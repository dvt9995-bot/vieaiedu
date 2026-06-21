import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { parseVideoRef, youtubeChannelName } from "@/lib/video";
import { getYouTubeStats } from "@/lib/youtube";

const FIELDS = ["title", "type", "duration_sec", "is_preview", "video_id", "content", "position", "section_id"];

// Khi gán video YouTube: tự lấy THỜI LƯỢNG video → điền duration_sec (khỏi nhập tay).
async function autoDurationFromYouTube(admin: NonNullable<ReturnType<typeof createAdminClient>>, lessonId: unknown, videoId: unknown) {
  const ref = parseVideoRef(typeof videoId === "string" ? videoId : null);
  if (ref?.kind !== "youtube" || !lessonId) return;
  const st = await getYouTubeStats(ref.id);
  if (st && st.durationSec > 0) await admin.from("lessons").update({ duration_sec: st.durationSec }).eq("id", lessonId as string);
}

// Tự tính tổng thời lượng khóa = tổng duration_sec của các bài → courses.total_minutes
async function recomputeCourseMinutes(admin: NonNullable<ReturnType<typeof createAdminClient>>, courseId: unknown) {
  if (!courseId) return;
  const { data } = await admin.from("lessons").select("duration_sec").eq("course_id", courseId as string);
  const sec = (data || []).reduce((n, l) => n + (Number(l.duration_sec) || 0), 0);
  await admin.from("courses").update({ total_minutes: Math.round(sec / 60) }).eq("id", courseId as string);
}

// Khi gán video YouTube: tự lấy TÊN KÊNH → điền "Nguồn" + "Giảng viên" của khóa (nếu admin để trống).
async function autoSourceFromYouTube(admin: NonNullable<ReturnType<typeof createAdminClient>>, courseId: string | null | undefined, videoId: unknown) {
  if (!courseId) return;
  const ref = parseVideoRef(typeof videoId === "string" ? videoId : null);
  if (ref?.kind !== "youtube") return;
  const { data: c } = await admin.from("courses").select("source, instructor").eq("id", courseId).maybeSingle();
  if (!c) return;
  const empty = (v: unknown) => v == null || String(v).trim() === "";
  const instrFillable = empty(c.instructor) || String(c.instructor).trim() === "Long Nam"; // "Long Nam" = mặc định → coi như chưa nhập
  if (!empty(c.source) && !instrFillable) return;
  const ch = await youtubeChannelName(ref.id);
  if (!ch) return;
  const patch: Record<string, string> = {};
  if (empty(c.source)) patch.source = ch;
  if (instrFillable) patch.instructor = ch; // giảng viên = tên kênh khi admin chưa nhập
  if (Object.keys(patch).length) await admin.from("courses").update(patch).eq("id", courseId);
}
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
    .from("sections").select("id, title, position, lessons(id, title, type, duration_sec, is_preview, video_id, content, position)")
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
  await autoSourceFromYouTube(admin, body.course_id, body.video_id);
  await autoDurationFromYouTube(admin, data.id, body.video_id);
  await recomputeCourseMinutes(admin, body.course_id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const { error } = await admin.from("lessons").update(pick(body)).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: l } = await admin.from("lessons").select("course_id").eq("id", body.id).maybeSingle();
  if (typeof body.video_id === "string" && body.video_id.startsWith("yt:")) {
    await autoSourceFromYouTube(admin, l?.course_id as string | undefined, body.video_id);
    await autoDurationFromYouTube(admin, body.id, body.video_id);
  }
  await recomputeCourseMinutes(admin, l?.course_id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;
  const id = new URL(req.url).searchParams.get("id");
  const { data: l } = await admin.from("lessons").select("course_id").eq("id", id).maybeSingle();
  const { error } = await admin.from("lessons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recomputeCourseMinutes(admin, l?.course_id);
  revalidateTag("courses", "max");
  return NextResponse.json({ ok: true });
}
