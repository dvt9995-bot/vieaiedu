"use client";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";

interface Order { id: string; title: string; slug: string; format: string; status: string; amount: number; wallet_used: number; coupon_code?: string | null; created_at: string; paid_at?: string | null; }

const ST: Record<string, { label: string; cls: string }> = {
  paid: { label: "Đã thanh toán", cls: "bg-success/15 text-success" },
  pending: { label: "Chờ thanh toán", cls: "bg-gold/15 text-warning" },
  cancelled: { label: "Đã hủy", cls: "bg-bg-soft text-ink-3" },
};
const fdate = (s?: string | null) => s ? new Date(s).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "";

interface ShopItem { title: string; qty: number }
interface ShopOrder { id: string; code?: string; total: number; status: string; has_physical?: boolean; created_at: string; shop_order_items?: ShopItem[] }
const SHOP_ST: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ thanh toán", cls: "bg-gold/15 text-warning" },
  paid: { label: "Đã thanh toán", cls: "bg-success/15 text-success" },
  shipped: { label: "Đang giao", cls: "bg-accent-weak text-accent" },
  delivered: { label: "Đã giao", cls: "bg-success/15 text-success" },
  completed: { label: "Hoàn tất", cls: "bg-success/15 text-success" },
  cancelled: { label: "Đã hủy", cls: "bg-bg-soft text-ink-3" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-bg-soft text-ink-3" },
  disputed: { label: "Đang khiếu nại", cls: "bg-warning-weak text-warning" },
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [shopOrders, setShopOrders] = useState<ShopOrder[]>([]);
  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then((d) => setOrders(d.orders || [])).catch(() => setOrders([]));
    fetch("/api/shop/orders").then((r) => r.json()).then((d) => setShopOrders(d.orders || [])).catch(() => {});
  }, []);

  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <h2 className="font-bold mb-4">🧾 Lịch sử mua hàng</h2>

      {/* Đơn sản phẩm (Shop) */}
      {shopOrders.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3 mb-2">🛍️ Sản phẩm (Shop)</div>
          <div className="space-y-2.5">
            {shopOrders.map((o) => {
              const st = SHOP_ST[o.status] || SHOP_ST.pending;
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
          <div className="text-xs font-bold uppercase tracking-wider text-ink-3 mt-5 mb-2">🎓 Khóa học</div>
        </div>
      )}

      {orders === null ? <p className="text-ink-3 text-sm">Đang tải…</p>
        : orders.length === 0 ? <p className="text-ink-3 text-sm">{shopOrders.length ? "Chưa có đơn khóa học nào." : "Bạn chưa có đơn hàng nào."}</p>
        : (
          <div className="space-y-2.5">
            {orders.map((o) => {
              const st = ST[o.status] || ST.pending;
              const href = o.format === "live" ? `/live/${o.slug}` : o.format === "bundle" ? "/courses" : `/learn/${o.slug}`;
              return (
                <div key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-border rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{o.title}</div>
                    <div className="text-xs text-ink-3">{fdate(o.paid_at || o.created_at)}{o.coupon_code ? ` · mã ${o.coupon_code}` : ""}{o.wallet_used > 0 ? ` · ví ${formatVND(o.wallet_used)}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatVND(o.amount)}</div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  {o.status === "paid" && <a href={href} className="text-xs font-semibold text-accent hover:underline shrink-0 basis-full sm:basis-auto sm:ml-2">{o.format === "live" ? "Vào lớp →" : "Vào học →"}</a>}
                </div>
              );
            })}
          </div>
        )}
    </section>
  );
}
