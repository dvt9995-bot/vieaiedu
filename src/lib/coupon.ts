import { createAdminClient } from "@/lib/supabase/admin";

/** Trả % giảm nếu mã hợp lệ, còn hạn & chưa hết lượt dùng, else 0. */
export async function validateCoupon(code: string): Promise<number> {
  if (!code) return 0;
  const admin = createAdminClient();
  if (!admin) return 0;
  const { data } = await admin
    .from("coupons").select("*") // select * để không phụ thuộc cột mới (an toàn nếu chưa chạy migration)
    .eq("code", code.trim().toUpperCase()).maybeSingle();
  if (!data || !data.active) return 0;
  if (data.expires_at && new Date(data.expires_at as string) < new Date()) return 0;
  if (data.max_uses != null && (data.used_count as number) >= (data.max_uses as number)) return 0; // hết lượt
  return (data.percent_off as number) || 0;
}

/** Tăng lượt dùng mã (gọi khi đơn áp mã thanh toán THÀNH CÔNG). Atomic, tôn trọng trần. */
export async function consumeCoupon(code?: string | null): Promise<void> {
  if (!code) return;
  const admin = createAdminClient();
  if (!admin) return;
  await admin.rpc("increment_coupon_use", { p_code: String(code).trim().toUpperCase() });
}
