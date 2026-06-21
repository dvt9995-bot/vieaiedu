import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeAssignment } from "@/lib/gemini";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 40;

// GET ?slug= → bài nộp mới nhất của tôi cho khóa
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ submission: null });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ submission: null });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ submission: null });
  const { data } = await supabase.from("assignment_submissions")
    .select("score, feedback, passed, content, created_at")
    .eq("user_id", user.id).eq("course_slug", slug)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ submission: data || null });
}

// POST {slug, content} → AI chấm → lưu → trả điểm + nhận xét
export async function POST(req: Request) {
  if (!rateLimit(`assign:${clientIp(req)}`, 8, 60_000))
    return NextResponse.json({ error: "Bạn nộp quá nhanh, thử lại sau ít phút." }, { status: 429 });
  const { slug, content } = await req.json().catch(() => ({}));
  if (!slug || !content || String(content).trim().length < 20)
    return NextResponse.json({ error: "Bài làm quá ngắn — hãy viết chi tiết hơn (≥ 20 ký tự)." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Chưa cấu hình" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });

  // Phải đã ghi danh
  const { data: enr } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", slug).maybeSingle();
  if (!enr) return NextResponse.json({ error: "Bạn cần ghi danh khóa học trước." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Chưa cấu hình" }, { status: 503 });
  const { data: course } = await admin.from("courses").select("title, assignment_title, assignment_brief").eq("slug", slug).maybeSingle();
  if (!course?.assignment_brief) return NextResponse.json({ error: "Khóa này chưa có bài tập." }, { status: 400 });

  const result = await gradeAssignment({
    courseTitle: (course.title as string) || slug,
    brief: course.assignment_brief as string,
    submission: String(content),
  });
  if (!result) return NextResponse.json({ error: "AI chưa chấm được (kiểm tra Gemini key/hạn mức). Thử lại sau." }, { status: 502 });

  await admin.from("assignment_submissions").insert({
    user_id: user.id, course_slug: slug, content: String(content).slice(0, 8000),
    score: result.score, feedback: result.feedback, passed: result.passed,
  });
  return NextResponse.json({ ok: true, ...result });
}
