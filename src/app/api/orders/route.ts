import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_ACCESS } from "@/lib/bundle";

// Lịch sử mua hàng của user hiện tại (đơn của chính mình).
export async function GET() {
  const s = await createClient();
  if (!s) return NextResponse.json({ orders: [] });
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const admin = createAdminClient()!;
  const { data } = await admin.from("orders")
    .select("id, course_slug, amount, status, wallet_used, coupon_code, created_at, paid_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const slugs = [...new Set((data || []).map((o) => o.course_slug).filter((x) => x && x !== ALL_ACCESS))];
  const { data: courses } = slugs.length ? await admin.from("courses").select("slug, title, format").in("slug", slugs as string[]) : { data: [] };
  const tmap = new Map((courses || []).map((c) => [c.slug, c]));
  const orders = (data || []).map((o) => {
    const c = tmap.get(o.course_slug);
    return {
      id: o.id, status: o.status, amount: o.amount, wallet_used: o.wallet_used, coupon_code: o.coupon_code,
      created_at: o.created_at, paid_at: o.paid_at,
      title: o.course_slug === ALL_ACCESS ? "Trọn bộ khóa học (All-access)" : (c?.title || o.course_slug),
      slug: o.course_slug, format: (c?.format as string) || (o.course_slug === ALL_ACCESS ? "bundle" : "video"),
    };
  });
  return NextResponse.json({ orders });
}
