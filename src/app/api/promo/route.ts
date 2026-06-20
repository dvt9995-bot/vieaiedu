import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Trả mã giảm giá đang hoạt động, sắp hết hạn nhất (cho banner ưu đãi).
export const revalidate = 60;

export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ promo: null });
  const nowIso = new Date().toISOString();
  const { data } = await admin.from("coupons").select("code, percent_off, expires_at")
    .eq("active", true).gt("expires_at", nowIso).order("expires_at", { ascending: true }).limit(1).maybeSingle();
  return NextResponse.json({ promo: data || null });
}
