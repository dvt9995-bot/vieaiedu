import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseBySlug } from "@/lib/courses";
import { notify } from "@/lib/notify";

// Khi học viên hoàn thành khóa: cấp chứng chỉ (mã xác thực) + thông báo.
export async function POST(req: Request) {
  const { slug } = await req.json().catch(() => ({ slug: "" }));
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const course = await getCourseBySlug(slug);
  if (!course) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Phải sở hữu khóa (hoặc khóa free)
  if (course.price !== 0) {
    const { data: en } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", slug).maybeSingle();
    if (!en) return NextResponse.json({ error: "not_enrolled" }, { status: 403 });
  }

  const admin = createAdminClient()!;
  // Đã có chứng chỉ?
  const { data: existing } = await admin.from("certificates").select("code").eq("user_id", user.id).eq("course_slug", slug).maybeSingle();
  let code = existing?.code as string | undefined;
  if (!code) {
    const { data: cert } = await admin.from("certificates").insert({ user_id: user.id, course_slug: slug }).select("code").single();
    code = cert?.code as string;
    await notify({
      userId: user.id, type: "learning",
      title: "🏆 Chúc mừng hoàn thành khóa học!",
      body: `Bạn đã hoàn thành "${course.title}". Nhận chứng chỉ ngay.`,
      href: `/certificate/${code}`,
    });
  }
  return NextResponse.json({ ok: true, code });
}
