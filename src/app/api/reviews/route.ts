import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  const admin = createAdminClient();
  if (!slug || !admin) return NextResponse.json({ reviews: [], avg: 0, count: 0 });
  const { data } = await admin.from("reviews").select("rating, body, created_at, profiles(full_name, avatar_url)").eq("course_slug", slug).order("created_at", { ascending: false }).limit(50);
  const reviews = (data || []).map((r) => ({
    rating: r.rating as number, body: (r.body as string) || "", created_at: r.created_at as string,
    author: (r as { profiles?: { full_name?: string } }).profiles?.full_name || "Học viên",
    avatar: (r as { profiles?: { avatar_url?: string } }).profiles?.avatar_url || null,
  }));
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return NextResponse.json({ reviews, avg, count });
}

export async function POST(req: Request) {
  if (!rateLimit(`review:${clientIp(req)}`, 10, 60_000)) return NextResponse.json({ error: "Thử lại sau." }, { status: 429 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  const { slug, rating, body } = await req.json().catch(() => ({}));
  if (!slug || !rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const admin = createAdminClient()!;
  // Chỉ học viên đã ghi danh mới được đánh giá
  const { count } = await admin.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("course_slug", slug);
  if (!count) return NextResponse.json({ error: "Bạn cần ghi danh khóa học để đánh giá" }, { status: 403 });
  const { error } = await admin.from("reviews").upsert({ user_id: user.id, course_slug: slug, rating, body: body || null }, { onConflict: "user_id,course_slug" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
