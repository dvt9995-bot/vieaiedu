import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCurrentUserAdmin } from "@/lib/admin-guard";
import { geminiHealthCheck } from "@/lib/gemini";
import { isSepayConfigured } from "@/lib/sepay";
import { isBunnyConfigured } from "@/lib/bunny";
import { isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient()!;

  const [gemini, sepay, bunny, email, lastPost] = await Promise.all([
    geminiHealthCheck(),
    isSepayConfigured(),
    isBunnyConfigured(),
    isEmailConfigured(),
    admin.from("blog_posts").select("published_at").order("published_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const last = lastPost.data?.published_at as string | undefined;
  const blogStale = last ? (Date.now() - new Date(last).getTime()) > 36 * 3600 * 1000 : true;

  const services = [
    { key: "supabase", label: "Cơ sở dữ liệu (Supabase)", ok: true, note: "Hoạt động" },
    { key: "gemini", label: "AI viết blog (Gemini)", ok: gemini.ok, note: gemini.ok ? "Sẵn sàng" : (gemini.reason || "Lỗi") },
    { key: "sepay", label: "Thanh toán (SePay)", ok: sepay, note: sepay ? "Đã cấu hình" : "Chưa cấu hình" },
    { key: "bunny", label: "Video (Bunny)", ok: bunny, note: bunny ? "Đã cấu hình" : "Chưa cấu hình" },
    { key: "email", label: "Email (Resend)", ok: email, note: email ? "Đã cấu hình" : "Chưa cấu hình" },
    { key: "blog", label: "Blog tự động", ok: !blogStale, note: last ? `Bài mới nhất: ${new Date(last).toLocaleString("vi-VN")}` : "Chưa có bài" },
  ];
  return NextResponse.json({ services });
}
