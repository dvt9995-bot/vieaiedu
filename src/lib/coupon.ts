import { createAdminClient } from "@/lib/supabase/admin";

/** Trả % giảm nếu mã hợp lệ & còn hạn, else 0. */
export async function validateCoupon(code: string): Promise<number> {
  if (!code) return 0;
  const admin = createAdminClient();
  if (!admin) return 0;
  const { data } = await admin
    .from("coupons").select("percent_off, active, expires_at")
    .eq("code", code.trim().toUpperCase()).maybeSingle();
  if (!data || !data.active) return 0;
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) return 0;
  return (data.percent_off as number) || 0;
}
