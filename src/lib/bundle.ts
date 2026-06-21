import { createAdminClient } from "@/lib/supabase/admin";
import { getConfig } from "@/lib/settings";

export const ALL_ACCESS = "all-access"; // slug đặc biệt cho gói trọn bộ

export type Bundle = { price: number; compare: number; title: string };

/** Cấu hình gói All-access (null nếu chưa bật / chưa đặt giá). */
export async function getBundle(): Promise<Bundle | null> {
  const [price, compare, title] = await Promise.all([
    getConfig("bundle_price"), getConfig("bundle_compare"), getConfig("bundle_title"),
  ]);
  const p = parseInt(price) || 0;
  if (p <= 0) return null;
  return { price: p, compare: parseInt(compare) || 0, title: title || "Trọn bộ khóa học — Truy cập trọn đời" };
}

/** Ghi danh user vào TẤT CẢ khóa đã xuất bản (dùng khi mua gói All-access). */
export async function enrollAllPublished(admin: NonNullable<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data } = await admin.from("courses").select("slug").eq("status", "published");
  const rows = (data || []).map((c) => ({ user_id: userId, course_slug: c.slug as string }));
  if (rows.length) await admin.from("enrollments").upsert(rows, { onConflict: "user_id,course_slug" });
}
