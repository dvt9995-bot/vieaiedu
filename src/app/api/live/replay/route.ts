import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bunnyEmbedUrl } from "@/lib/bunny";

// Trả link xem lại bản ghi buổi live — chỉ cho học viên ĐÃ ghi danh.
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session");
  if (!sessionId) return NextResponse.json({ error: "missing" }, { status: 400 });
  const s = await createClient();
  if (!s) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data: sess } = await admin.from("live_sessions").select("recording_url, course_id").eq("id", sessionId).maybeSingle();
  if (!sess?.recording_url) return NextResponse.json({ error: "no_recording" }, { status: 404 });
  const { data: course } = await admin.from("courses").select("slug").eq("id", sess.course_id).maybeSingle();
  const { data: enr } = await admin.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", course?.slug).maybeSingle();
  if (!enr) return NextResponse.json({ error: "not_enrolled" }, { status: 403 });
  const rec = sess.recording_url as string;
  // http(s) = link ngoài (Drive/YouTube admin dán tay) · còn lại = Bunny GUID → phát qua player có token
  if (/^https?:\/\//i.test(rec)) return NextResponse.json({ url: rec, kind: "external" });
  return NextResponse.json({ url: await bunnyEmbedUrl(rec), kind: "bunny" });
}
