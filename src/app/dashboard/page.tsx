import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardClient, { type DashData } from "@/components/DashboardClient";
import { createClient, isSupabaseConfigured, getCurrentUser } from "@/lib/supabase/server";
import { getCourses } from "@/lib/courses";

export const metadata: Metadata = { title: "Học của tôi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <DashboardClient data={{ name: "Học viên", studentCode: "—", avatarUrl: "", joined: "", role: "Học viên", courses: [], certs: 0, totalCompleted: 0 }} />;
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const [{ data: profile }, { data: enr }, { data: lp }, { count: certs }, allCourses] = await Promise.all([
    supabase!.from("profiles").select("full_name, student_code, avatar_url, created_at, role").eq("id", user.id).maybeSingle(),
    supabase!.from("enrollments").select("course_slug").eq("user_id", user.id),
    supabase!.from("lesson_progress").select("course_slug").eq("user_id", user.id).eq("completed", true),
    supabase!.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    getCourses(),
  ]);

  const completedByCourse: Record<string, number> = {};
  for (const r of lp ?? []) completedByCourse[r.course_slug as string] = (completedByCourse[r.course_slug as string] || 0) + 1;

  const slugs = (enr ?? []).map((e) => e.course_slug as string);
  // Lấy TẤT CẢ khóa đã ghi danh trực tiếp từ DB (cả video LẪN live) — getCourses() chỉ trả khóa video nên khóa LIVE bị mất khỏi "Học của tôi".
  const { data: encRows } = slugs.length
    ? await supabase!.from("courses").select("slug, title, format").in("slug", slugs).eq("status", "published")
    : { data: [] };
  const courses = (encRows || []).map((c) => {
    const full = allCourses.find((x) => x.slug === c.slug);          // chỉ khóa video có trong catalog cache (để tính tiến độ bài học)
    const total = full ? (full.sections.flatMap((s) => s.lessons).length || 1) : 0;
    const done = completedByCourse[c.slug as string] || 0;
    return { slug: c.slug as string, title: c.title as string, thumb: full?.thumb || "", format: (c.format as string) || "video", pct: total ? Math.min(100, Math.round((done / total) * 100)) : 0 };
  }) as DashData["courses"];

  const created = profile?.created_at ? new Date(profile.created_at as string) : new Date();
  const data: DashData = {
    name: (profile?.full_name as string) || "Học viên",
    studentCode: (profile?.student_code as string) || "—",
    avatarUrl: (profile?.avatar_url as string) || "",
    joined: `${String(created.getMonth() + 1).padStart(2, "0")}/${created.getFullYear()}`,
    role: profile?.role === "admin" ? "Quản trị viên" : profile?.role === "instructor" ? "Giảng viên" : "Học viên",
    courses,
    certs: certs || 0,
    totalCompleted: Object.values(completedByCourse).reduce((a, b) => a + b, 0),
  };
  return <DashboardClient data={data} />;
}
