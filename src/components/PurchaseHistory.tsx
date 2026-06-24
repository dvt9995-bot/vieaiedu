"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatVND } from "@/lib/format";

interface CourseOrder { id: string; title: string; slug: string; format: string; status: string; amount: number; wallet_used: number; coupon_code?: string | null; created_at: string; paid_at?: string | null; }
interface ShopItem { title: string; qty: number }
interface ShopOrder { id: string; code?: string; total: number; status: string; has_physical?: boolean; created_at: string; shop_order_items?: ShopItem[] }

const CST: Record<string, { label: string; cls: string }> = {
  paid: { label: "Đã thanh toán", cls: "bg-success/15 text-success" },
  pending: { label: "Chờ thanh toán", cls: "bg-gold/15 text-warning" },
  cancelled: { label: "Đã hủy", cls: "bg-bg-soft text-ink-3" },
  expired: { label: "Hết hạn", cls: "bg-bg-soft text-ink-3" },
};
const SST: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ thanh toán", cls: "bg-gold/15 text-warning" },
  paid: { label: "Đã thanh toán", cls: "bg-success/15 text-success" },
  shipped: { label: "Đang giao", cls: "bg-accent-weak text-accent" },
  delivered: { label: "Đã giao", cls: "bg-success/15 text-success" },
  completed: { label: "Hoàn tất", cls: "bg-success/15 text-success" },
  cancelled: { label: "Đã hủy", cls: "bg-bg-soft text-ink-3" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-bg-soft text-ink-3" },
  disputed: { label: "Đang khiếu nại", cls: "bg-warning-weak text-warning" },
};
const PAID_COURSE = ["paid"];
const PAID_SHOP = ["paid", "shipped", "delivered", "completed"];
const fdate = (s?: string | null) => s ? new Date(s).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "";

type Tab = "all" | "course" | "shop";

export default function PurchaseHistory() {
  const [courses, setCourses] = useState<CourseOrder[] | null>(null);
  const [shop, setShop] = useState<ShopOrder[]>([]);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then((d) => setCourses(d.orders || [])).catch(() => setCourses([]));
    fetch("/api/shop/orders").then((r) => r.json()).then((d) => setShop(d.orders || [])).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const cs = courses || [];
    const spentCourse = cs.filter((o) => PAID_COURSE.includes(o.status)).reduce((n, o) => n + (o.amount || 0) + (o.wallet_used || 0), 0);
    const spentShop = shop.filter((o) => PAID_SHOP.includes(o.status)).reduce((n, o) => n + (o.total || 0), 0);
    const total = cs.length + shop.length;
    const paid = cs.filter((o) => PAID_COURSE.includes(o.status)).length + shop.filter((o) => PAID_SHOP.includes(o.status)).length;
    const pending = cs.filter((o) => o.status === "pending").length + shop.filter((o) => o.status === "pending").length;
    return { spent: spentCourse + spentShop, total, paid, pending };
  }, [courses, shop]);

  const loading = courses === null;
  const showCourse = tab === "all" || tab === "course";
  const showShop = tab === "all" || tab === "shop";

  return (
    <div className="space-y-6">
      {/* Thống kê chi tiêu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["💸 Tổng đã chi", formatVND(stats.spent), "text-accent"],
          ["🧾 Tổng số đơn", String(stats.total), ""],
          ["✅ Đã thanh toán", String(stats.paid), "text-success"],
          ["⏳ Chờ thanh toán", String(stats.pending), "text-warning"],
        ].map(([l, v, cls], i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-4">
            <div className={`text-xl font-extrabold tracking-tight ${cls}`}>{v}</div>
            <div className="text-ink-3 text-xs mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Lọc loại */}
      <div className="flex gap-2">
        {([["all", "Tất cả"], ["course", "🎓 Khóa học"], ["shop", "🛍️ Sản phẩm"]] as [Tab, string][]).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={`text-sm font-semibold rounded-full px-4 py-2 cursor-pointer transition-colors ${tab === t ? "bg-accent-weak text-accent" : "text-ink-2 hover:bg-bg-soft"}`}>{l}</button>
        ))}
      </div>

      {loading ? <p className="text-ink-3 text-sm">Đang tải…</p> : (
        <>
          {/* Khóa học */}
          {showCourse && (
            <section className="rounded-card border border-border bg-surface p-5">
              <h2 className="font-bold mb-3">🎓 Khóa học</h2>
              {(courses || []).length === 0 ? <p className="text-ink-3 text-sm">Chưa có đơn khóa học.</p> : (
                <div className="space-y-2.5">
                  {(courses || []).map((o) => {
                    const st = CST[o.status] || CST.pending;
                    const href = o.format === "live" ? `/live/${o.slug}` : o.format === "bundle" ? "/courses" : `/learn/${o.slug}`;
                    return (
                      <div key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-border rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{o.format === "live" && <span className="text-[10px] font-bold text-accent bg-accent-weak rounded-full px-1.5 py-0.5 mr-1">LIVE</span>}{o.title}</div>
                          <div className="text-xs text-ink-3">{fdate(o.paid_at || o.created_at)}{o.coupon_code ? ` · mã ${o.coupon_code}` : ""}{o.wallet_used > 0 ? ` · ví ${formatVND(o.wallet_used)}` : ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{formatVND(o.amount)}</div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </div>
                        {PAID_COURSE.includes(o.status) && <a href={href} className="text-xs font-semibold text-accent hover:underline shrink-0 basis-full sm:basis-auto sm:ml-2">{o.format === "live" ? "Vào lớp →" : "Vào học →"}</a>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Sản phẩm (Shop) */}
          {showShop && (
            <section className="rounded-card border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">🛍️ Sản phẩm (Shop)</h2>
                {shop.length > 0 && <Link href="/shop/orders" className="text-xs font-semibold text-accent hover:underline">Quản lý đơn sản phẩm →</Link>}
              </div>
              {shop.length === 0 ? <p className="text-ink-3 text-sm">Chưa có đơn sản phẩm.</p> : (
                <div className="space-y-2.5">
                  {shop.map((o) => {
                    const st = SST[o.status] || SST.pending;
                    return (
                      <div key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-border rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{(o.shop_order_items || []).map((it) => `${it.title}×${it.qty}`).join(", ") || "Đơn sản phẩm"}</div>
                          <div className="text-xs text-ink-3">{fdate(o.created_at)}{o.code ? ` · #${o.code}` : ""}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{formatVND(o.total)}</div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </div>
                        <a href="/shop/orders" className="text-xs font-semibold text-accent hover:underline shrink-0 basis-full sm:basis-auto sm:ml-2">Chi tiết →</a>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {stats.total === 0 && <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Bạn chưa có đơn hàng nào. <Link href="/courses" className="text-accent font-semibold">Khám phá khóa học →</Link></div>}
        </>
      )}
    </div>
  );
}
