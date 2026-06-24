import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, getCurrentUser } from "@/lib/supabase/server";
import PurchaseHistory from "@/components/PurchaseHistory";

export const metadata: Metadata = { title: "Lịch sử mua hàng", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/orders");
  }
  return (
    <div className="container-x py-12 max-w-3xl">
      <div className="text-xs uppercase tracking-wider text-accent font-semibold">Tài khoản</div>
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight mt-1 mb-1">Lịch sử mua hàng &amp; chi tiêu</h1>
      <p className="text-ink-2 mb-8">Toàn bộ đơn khóa học và sản phẩm của bạn — đã thanh toán và chờ thanh toán.</p>
      <PurchaseHistory />
    </div>
  );
}
