import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { joinWindow } from "@/lib/live";

// Trả link Meet CHỈ KHI: đã đăng nhập + đã ghi danh khóa + đang trong khung giờ vào lớp.
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session");
  if (!sessionId) return NextResponse.json({ error: "missing" }, { status: 400 });
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data: sess } = await admin.from("live_sessions").select("starts_at, duration_min, meet_url, course_id").eq("id", sessionId).maybeSingle();
  if (!sess) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: course } = await admin.from("courses").select("slug").eq("id", sess.course_id).maybeSingle();
  const { data: enr } = await admin.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", course?.slug).maybeSingle();
  if (!enr) return NextResponse.json({ error: "not_enrolled" }, { status: 403 });
  const w = joinWindow(sess.starts_at as string, sess.duration_min as number);
  if (!w.open) return NextResponse.json({ error: w.reason, opensAt: w.opensAt }, { status: 425 });
  if (!sess.meet_url) return NextResponse.json({ error: "no_link" }, { status: 409 });
  return NextResponse.json({ url: sess.meet_url });
}
