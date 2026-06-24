"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatVND } from "@/lib/format";
import { trackingUrl, carrierName } from "@/lib/carriers";
import { toast } from "@/components/Toaster";

interface Item { id: string; title: string; type: string; price: number; qty: number; variant?: string; digital_url?: string | null; digital_note?: string | null; product_id?: string }
interface Order { id: string; code: string; total: number; status: string; escrow_status: string; has_physical: boolean; tracking_code?: string; carrier?: string; created_at: string; shops?: { name: string }; shop_order_items: Item[] }

const ST: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ thanh toán", cls: "bg-gold/15 text-amber-700" },
  paid: { label: "Đã thanh toán", cls: "bg-success/15 text-success" },
  shipped: { label: "Đang giao", cls: "bg-blue-500/15 text-blue-600" },
  delivered: { label: "Đã giao", cls: "bg-success/15 text-success" },
  completed: { label: "Hoàn tất", cls: "bg-success/15 text-success" },
  disputed: { label: "Đang khiếu nại", cls: "bg-accent-weak text-accent" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-bg-soft text-ink-3" },
  cancelled: { label: "Đã hủy", cls: "bg-bg-soft text-ink-3" },
};

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [reviewing, setReviewing] = useState<{ order: string; product: string } | null>(null);
  const [rv, setRv] = useState({ rating: "5", body: "" });
  const load = useCallback(async () => { const r = await fetch("/api/shop/orders").then((x) => x.json()).catch(() => ({})); setOrders(r.orders || []); }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: string, reason?: string) {
    const res = await fetch("/api/shop/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, reason }) });
    const d = await res.json(); if (!res.ok) return toast(d.error || "Lỗi");
    toast(action === "confirm" ? "Đã xác nhận nhận hàng" : "Đã gửi khiếu nại"); load();
  }
  async function submitReview() {
    if (!reviewing) return;
    const res = await fetch("/api/shop/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: reviewing.product, order_id: reviewing.order, rating: Number(rv.rating), body: rv.body }) });
    const d = await res.json(); if (!res.ok) return toast(d.error || "Lỗi");
    toast("Cảm ơn đánh giá của bạn!"); setReviewing(null); setRv({ rating: "5", body: "" }); load();
  }

  if (orders === null) return <div className="container-x py-16 text-center text-ink-3">Đang tải…</div>;
  return (
    <div className="container-x py-10 max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight mb-6">📦 Đơn hàng của tôi</h1>
      {orders.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Chưa có đơn nào. <Link href="/shop" className="text-accent font-semibold">Mua sắm →</Link></div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => { const st = ST[o.status] || ST.pending; const paid = ["paid", "shipped", "delivered", "completed"].includes(o.status); return (
            <div key={o.id} className="rounded-card border border-border bg-surface p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="text-sm"><b>{o.shops?.name}</b> <span className="text-ink-3 text-xs">· {new Date(o.created_at).toLocaleDateString("vi-VN")}</span></div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
              </div>
              {o.shop_order_items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3 py-1.5 text-sm border-t border-border first:border-0">
                  <div className="min-w-0">
                    <div className="font-medium">{it.title} <span className="text-ink-3">×{it.qty}</span></div>
                    {it.variant && <div className="text-xs text-ink-3">{it.variant}</div>}
                    {it.type === "digital" && paid && it.digital_url && <a href={`/api/shop/download?item=${it.id}`} target="_blank" rel="noreferrer" className="text-accent text-xs font-semibold">⬇ Tải / Truy cập sản phẩm (bảo mật)</a>}
                    {it.type === "digital" && paid && it.digital_note && <div className="text-xs text-ink-2 mt-0.5">{it.digital_note}</div>}
                    {paid && it.product_id && <button onClick={() => setReviewing({ order: o.id, product: it.product_id! })} className="text-ink-3 hover:text-accent text-xs font-semibold mt-0.5 cursor-pointer block">★ Đánh giá</button>}
                  </div>
                  <div className="font-semibold shrink-0">{formatVND(it.price * it.qty)}</div>
                </div>
              ))}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-sm">Tổng: <b className="text-accent">{formatVND(o.total)}</b></span>
                <div className="flex gap-2">
                  {o.tracking_code && (trackingUrl(o.carrier, o.tracking_code)
                    ? <a href={trackingUrl(o.carrier, o.tracking_code)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent self-center">🚚 Theo dõi ({carrierName(o.carrier)})</a>
                    : <span className="text-xs text-ink-3 self-center">VĐ: {o.tracking_code} {carrierName(o.carrier)}</span>)}
                  {o.escrow_status === "held" && ["paid", "shipped", "delivered"].includes(o.status) && <button onClick={() => act(o.id, "confirm")} className="text-xs font-semibold text-success cursor-pointer">✓ Đã nhận</button>}
                  {o.escrow_status === "held" && o.status !== "disputed" && <button onClick={() => { const r = prompt("Lý do khiếu nại:"); if (r) act(o.id, "dispute", r); }} className="text-xs font-semibold text-accent cursor-pointer">Khiếu nại</button>}
                  {o.status === "pending" && <span className="text-xs text-ink-3">Mã CK: {o.code}</span>}
                </div>
              </div>
            </div>
          ); })}
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setReviewing(null)}>
          <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[400px] p-5">
            <h3 className="font-bold text-lg mb-3">Đánh giá sản phẩm</h3>
            <select className="w-full mb-2 px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm" value={rv.rating} onChange={(e) => setRv({ ...rv, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}</select>
            <textarea className="w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm" rows={3} placeholder="Cảm nhận của bạn…" value={rv.body} onChange={(e) => setRv({ ...rv, body: e.target.value })} />
            <div className="flex gap-2 mt-3"><button onClick={submitReview} className="rounded-full bg-accent text-white font-semibold text-sm px-5 py-2.5 cursor-pointer">Gửi</button><button onClick={() => setReviewing(null)} className="rounded-full border border-border-strong text-sm px-4 py-2.5 cursor-pointer">Hủy</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
