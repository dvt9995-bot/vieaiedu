import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { isCurrentUserAdmin } from "@/lib/admin-guard";

// Chạy mỗi ~15 phút: nhắc học viên trước buổi LIVE 1 giờ và 10 phút.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed = secret ? req.headers.get("authorization") === `Bearer ${secret}` : await isCurrentUserAdmin();
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "unconfigured" }, { status: 503 });

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  let sent = 0;

  // Lấy các buổi sắp diễn ra trong 25 giờ tới (đủ để nhắc trước 1 ngày / 1 giờ / 10 phút)
  const { data: sessions } = await admin.from("live_sessions")
    .select("id, course_id, title, starts_at, duration_min, reminded_24h, reminded_1h, reminded_10m")
    .gte("starts_at", iso(now - 5 * 60000)).lte("starts_at", iso(now + 25 * 3600000));

  for (const ss of sessions || []) {
    const start = new Date(ss.starts_at as string).getTime();
    const mins = (start - now) / 60000;
    let kind: "24h" | "1h" | "10m" | null = null;
    if (mins <= 12 && !ss.reminded_10m) kind = "10m";
    else if (mins <= 65 && mins > 12 && !ss.reminded_1h) kind = "1h";
    else if (mins <= 1500 && mins > 65 && !ss.reminded_24h) kind = "24h"; // trong ~25h tới → nhắc trước 1 ngày
    if (!kind) continue;

    const { data: course } = await admin.from("courses").select("slug, title").eq("id", ss.course_id).maybeSingle();
    if (!course) continue;
    const { data: enr } = await admin.from("enrollments").select("user_id").eq("course_slug", course.slug);
    const when = new Date(start).toLocaleString("vi-VN", { weekday: "long", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
    const title = kind === "10m" ? "🔴 Lớp học bắt đầu sau 10 phút!" : kind === "1h" ? "⏰ Lớp học bắt đầu sau 1 giờ" : "📅 Nhắc lịch: ngày mai bạn có buổi học";
    const body = `"${course.title}"${ss.title ? " — " + ss.title : ""} lúc ${when}.${kind === "24h" ? " Nhớ sắp xếp thời gian nhé!" : " Bấm để vào lớp."}`;
    for (const e of enr || []) {
      // Email cho mốc 1 ngày & 1 giờ (đủ thời gian); mốc 10' chỉ in-app + push cho kịp
      await notify({ userId: e.user_id as string, type: "learning", title, body, href: `/live/${course.slug}`, push: true, email: kind !== "10m" });
      sent++;
    }
    await admin.from("live_sessions").update(kind === "10m" ? { reminded_10m: true } : kind === "1h" ? { reminded_1h: true } : { reminded_24h: true }).eq("id", ss.id);
  }
  return NextResponse.json({ ok: true, sent });
}
