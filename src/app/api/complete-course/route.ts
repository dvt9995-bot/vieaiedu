import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseBySlug } from "@/lib/courses";
import { notify } from "@/lib/notify";
import { getConfig } from "@/lib/settings";

// Khi học viên hoàn thành khóa: ghi nhận hoàn thành. Chỉ cấp chứng chỉ khi đã
// hoàn thành tối thiểu 5 khóa TRẢ PHÍ.
export async function POST(req: Request) {
  const { slug } = await req.json().catch(() => ({ slug: "" }));
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const course = await getCourseBySlug(slug);
  if (!course) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const paid = course.price !== 0;
  // Khóa trả phí phải đã sở hữu
  if (paid) {
    const { data: en } = await supabase.from("enrollments").select("id").eq("user_id", user.id).eq("course_slug", slug).maybeSingle();
    if (!en) return NextResponse.json({ error: "not_enrolled" }, { status: 403 });
  }

  const REQUIRED_PAID = parseInt(await getConfig("cert_required_paid")) || 5; // ngưỡng cấu hình ở admin

  const admin = createAdminClient()!;
  // Ghi nhận hoàn thành khóa (idempotent)
  await admin.from("course_completions").upsert({ user_id: user.id, course_slug: slug, paid }, { onConflict: "user_id,course_slug" });

  // Đếm số khóa TRẢ PHÍ đã hoàn thành
  const { count } = await admin.from("course_completions").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("paid", true);
  const paidDone = count || 0;

  // Chưa đủ điều kiện → chưa cấp chứng chỉ
  if (paidDone < REQUIRED_PAID) {
    await notify({
      userId: user.id, type: "learning",
      title: "✅ Đã hoàn thành khóa học!",
      body: `Bạn đã hoàn thành "${course.title}". Hoàn thành ${REQUIRED_PAID - paidDone} khóa trả phí nữa để được cấp chứng chỉ.`,
      href: "/dashboard",
    });
    return NextResponse.json({ ok: true, eligible: false, paidDone, needed: REQUIRED_PAID });
  }

  // Đủ điều kiện → cấp chứng chỉ cho các khóa đã hoàn thành (bù các khóa trước chưa có)
  const [{ data: comps }, { data: certs }] = await Promise.all([
    admin.from("course_completions").select("course_slug").eq("user_id", user.id),
    admin.from("certificates").select("course_slug, code").eq("user_id", user.id),
  ]);
  const haveCert = new Map((certs || []).map((c) => [c.course_slug as string, c.code as string]));
  const firstTime = (certs || []).length === 0;
  for (const comp of comps || []) {
    const cs = comp.course_slug as string;
    if (!haveCert.has(cs)) {
      const { data: ins } = await admin.from("certificates").insert({ user_id: user.id, course_slug: cs }).select("code").single();
      if (ins?.code) haveCert.set(cs, ins.code as string);
    }
  }

  const code = haveCert.get(slug);
  await notify({
    userId: user.id, type: "learning",
    title: firstTime ? "🎉 Bạn đã đủ điều kiện nhận chứng chỉ!" : "🏆 Chúc mừng hoàn thành khóa học!",
    body: firstTime
      ? `Bạn đã hoàn thành ${REQUIRED_PAID} khóa trả phí. Chứng chỉ của bạn đã sẵn sàng!`
      : `Bạn đã hoàn thành "${course.title}". Nhận chứng chỉ ngay.`,
    href: code ? `/certificate/${code}` : "/dashboard",
  });

  return NextResponse.json({ ok: true, eligible: true, code });
}
