import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { gcalConfigured, findDriveRecording, driveMediaSource } from "@/lib/gcal";
import { fetchBunnyFromUrl } from "@/lib/bunny";
import { notify } from "@/lib/notify";

export const maxDuration = 60;

// Chạy mỗi giờ: với buổi LIVE đã kết thúc & chưa có bản ghi → tìm bản ghi trong Google Drive
// → đẩy lên Bunny (Bunny tự tải) → lưu GUID làm video xem lại + báo học viên.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed = secret ? req.headers.get("authorization") === `Bearer ${secret}` : await isCurrentUserAdmin();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!(await gcalConfigured())) return NextResponse.json({ ok: true, skipped: "gcal-not-connected" });

  const now = Date.now();
  const within48h = new Date(now - 48 * 3600 * 1000).toISOString();
  // Buổi chưa có bản ghi, chưa xử lý, trong 48h
  const { data: sessions } = await admin.from("live_sessions")
    .select("id, course_id, title, starts_at, duration_min, recording_url, recording_status")
    .is("recording_url", null).is("recording_status", null)
    .gte("starts_at", within48h).lte("starts_at", new Date(now).toISOString());

  let done = 0;
  for (const ss of sessions || []) {
    const endMs = new Date(ss.starts_at as string).getTime() + (Number(ss.duration_min) || 90) * 60000;
    if (now < endMs + 5 * 60000) continue; // chỉ xử lý sau khi buổi kết thúc ~5 phút

    const { data: course } = await admin.from("courses").select("slug, title").eq("id", ss.course_id).maybeSingle();
    if (!course) continue;

    const rec = await findDriveRecording(course.title as string, ss.starts_at as string);
    if (!rec) continue; // chưa thấy bản ghi (Meet xử lý trễ) → để lần chạy sau thử lại

    const src = await driveMediaSource(rec.fileId);
    if (!src) continue;
    const guid = await fetchBunnyFromUrl(`${course.title} — ${ss.title || "Buổi học"}`, src.url, { Authorization: `Bearer ${src.token}` });
    if (!guid) { await admin.from("live_sessions").update({ recording_status: "failed" }).eq("id", ss.id); continue; }

    await admin.from("live_sessions").update({ recording_url: guid, recording_status: "processing" }).eq("id", ss.id);
    done++;

    // Báo học viên đã ghi danh: có video xem lại
    const { data: enr } = await admin.from("enrollments").select("user_id").eq("course_slug", course.slug);
    for (const e of enr || []) {
      await notify({ userId: e.user_id as string, type: "learning", title: "🎬 Đã có video xem lại buổi học", body: `Buổi "${ss.title || course.title}" đã được lưu — vào xem lại bất cứ lúc nào.`, href: `/live/${course.slug}` });
    }
  }
  return NextResponse.json({ ok: true, processed: done });
}
