"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/Toaster";
import { formatVND } from "@/lib/format";
import Button from "@/components/ui/Button";

interface Ov { held: number; released_seller: number; fee_collected: number; refunded: number; orders_paid: number; revenue: number }
interface Cnt { shops_pending: number; products_pending: number; disputes_open: number }

export default function ShopManager() {
  const [ov, setOv] = useState<Ov | null>(null);
  const [cnt, setCnt] = useState<Cnt | null>(null);
  const [recent, setRecent] = useState<Record<string, unknown>[]>([]);
  const [shops, setShops] = useState<Record<string, unknown>[]>([]);
  const [products, setProducts] = useState<Record<string, unknown>[]>([]);
  const [cats, setCats] = useState<Record<string, unknown>[]>([]);
  const [disputes, setDisputes] = useState<Record<string, unknown>[]>([]);
  const [newCat, setNewCat] = useState({ name: "", fee_percent: "10" });

  const load = useCallback(async () => {
    const [o, s, p, c, d] = await Promise.all([
      fetch("/api/admin/shop-overview").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/shops").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/shop-products").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/shop-categories").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/shop-disputes").then((r) => r.json()).catch(() => ({})),
    ]);
    setOv(o.overview || null); setCnt(o.counts || null); setRecent(o.recent || []);
    setShops(s.shops || []); setProducts(p.products || []); setCats(c.categories || []); setDisputes(d.disputes || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function shopAct(id: string, action: string) { const note = action === "suspend" ? prompt("Lý do khóa:") || "" : ""; await fetch("/api/admin/shops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, note }) }); toast("Đã cập nhật"); load(); }
  async function prodAct(id: string, action: string) { const note = action === "reject" ? prompt("Góp ý:") || "" : ""; await fetch("/api/admin/shop-products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, note }) }); toast("Đã cập nhật"); load(); }
  async function disputeAct(id: string, action: string) { if (!confirm(action === "refund" ? "Hoàn tiền người mua?" : "Trả tiền người bán?")) return; await fetch("/api/admin/shop-disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) }); toast("Đã xử lý"); load(); }
  async function addCat() { if (!newCat.name.trim()) return; await fetch("/api/admin/shop-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCat) }); setNewCat({ name: "", fee_percent: "10" }); load(); }
  async function setFee(id: string, fee: string) { await fetch("/api/admin/shop-categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, fee_percent: fee }) }); load(); }

  const card = "rounded-card border border-border bg-surface p-5";
  return (
    <div className="space-y-6">
      {/* Tiền & phí sàn */}
      {ov && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[["💰 Phí sàn thu được", ov.fee_collected, "text-accent"], ["🔒 Đang tạm giữ (escrow)", ov.held, ""], ["✅ Đã trả người bán", ov.released_seller, ""], ["📊 GMV (tổng giao dịch)", ov.revenue, ""], ["↩️ Đã hoàn tiền", ov.refunded, ""], ["🧾 Đơn đã thanh toán", ov.orders_paid, "", true]].map(([l, v, cls, isCount], i) => (
            <div key={i} className="rounded-card border border-border bg-surface p-4">
              <div className={`text-2xl font-extrabold tracking-tight ${cls}`}>{isCount ? String(v) : formatVND(v as number)}</div>
              <div className="text-ink-3 text-xs mt-0.5">{l as string}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tranh chấp */}
      {disputes.length > 0 && (
        <div className={card}>
          <div className="text-sm font-semibold mb-3 text-accent">⚠️ Khiếu nại cần xử lý ({disputes.length})</div>
          <div className="space-y-2">
            {disputes.map((d) => { const o = d.shop_orders as Record<string, unknown>; const pr = d.profiles as Record<string, unknown>; return (
              <div key={d.id as string} className="border border-border rounded-lg p-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-semibold">{formatVND((o?.total as number) || 0)} · {(pr?.full_name as string) || (pr?.email as string)}</div>
                  <div className="text-xs text-ink-2">{d.reason as string}</div>
                </div>
                <button onClick={() => disputeAct(d.id as string, "refund")} className="text-xs font-semibold text-accent cursor-pointer">Hoàn người mua</button>
                <button onClick={() => disputeAct(d.id as string, "release")} className="text-xs font-semibold text-success cursor-pointer">Trả người bán</button>
              </div>
            ); })}
          </div>
        </div>
      )}

      {/* Shop chờ duyệt */}
      <div className={card}>
        <div className="text-sm font-semibold mb-3">🏪 Shop {cnt && cnt.shops_pending > 0 && <span className="text-accent">({cnt.shops_pending} chờ duyệt)</span>}</div>
        {shops.length === 0 ? <p className="text-ink-3 text-sm">Chưa có shop.</p> : (
          <div className="space-y-2">{shops.map((s) => { const owner = s.owner as Record<string, unknown> | null; return (
            <div key={s.id as string} className="border border-border rounded-lg p-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex-1 min-w-[180px]"><div className="font-semibold text-sm">{s.name as string} <span className="text-xs text-ink-3">· {(owner?.full_name as string) || (owner?.email as string)}</span></div><div className="text-xs text-ink-3">{s.status as string}</div></div>
              {s.status === "pending" && <Button variant="success" size="sm" onClick={() => shopAct(s.id as string, "approve")}>Duyệt</Button>}
              {s.status === "approved" && <button onClick={() => shopAct(s.id as string, "suspend")} className="text-xs font-semibold text-accent cursor-pointer">Khóa</button>}
              {s.status === "suspended" && <button onClick={() => shopAct(s.id as string, "approve")} className="text-xs font-semibold text-success cursor-pointer">Mở lại</button>}
            </div>
          ); })}</div>
        )}
      </div>

      {/* Sản phẩm chờ duyệt */}
      <div className={card}>
        <div className="text-sm font-semibold mb-3">📦 Sản phẩm chờ duyệt {cnt && cnt.products_pending > 0 && <span className="text-accent">({cnt.products_pending})</span>}</div>
        {products.length === 0 ? <p className="text-ink-3 text-sm">Không có sản phẩm chờ duyệt.</p> : (
          <div className="space-y-2">{products.map((p) => (
            <div key={p.id as string} className="border border-border rounded-lg p-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex-1 min-w-[180px]"><div className="font-semibold text-sm">{p.title as string} <span className="text-xs text-ink-3">· {(p.type as string) === "digital" ? "Số" : "Vật lý"} · {formatVND((p.price as number) || 0)}</span></div><div className="text-xs text-ink-3">{(p.shops as Record<string, unknown>)?.name as string}</div></div>
              <a href={`/shop/p/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs text-ink-2 hover:text-ink">Xem</a>
              <Button variant="success" size="sm" onClick={() => prodAct(p.id as string, "approve")}>Duyệt</Button>
              <button onClick={() => prodAct(p.id as string, "reject")} className="text-xs font-semibold text-accent cursor-pointer">Từ chối</button>
            </div>
          ))}</div>
        )}
      </div>

      {/* Danh mục + phí sàn */}
      <div className={card}>
        <div className="text-sm font-semibold mb-3">🏷️ Danh mục &amp; phí sàn</div>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.id as string} className="flex items-center gap-3 text-sm">
              <span className="flex-1">{c.name as string}</span>
              <div className="flex items-center gap-1"><input type="number" defaultValue={String(c.fee_percent)} onBlur={(e) => setFee(c.id as string, e.target.value)} className="w-16 px-2 py-1 rounded border border-border-strong bg-surface text-sm text-right" /><span className="text-ink-3">%</span></div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <input className="flex-1 px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm" placeholder="Tên danh mục mới" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
            <input type="number" className="w-20 px-2 py-2 rounded-lg border border-border-strong bg-surface text-sm" value={newCat.fee_percent} onChange={(e) => setNewCat({ ...newCat, fee_percent: e.target.value })} />
            <Button variant="primary" onClick={addCat}>Thêm</Button>
          </div>
        </div>
      </div>

      {/* Đơn gần đây */}
      <div className={card}>
        <div className="text-sm font-semibold mb-3">🧾 Đơn gần đây</div>
        {recent.length === 0 ? <p className="text-ink-3 text-sm">Chưa có đơn.</p> : (
          <div className="space-y-1.5 text-sm">{recent.map((o) => (
            <div key={o.id as string} className="flex items-center justify-between border-b border-border pb-1.5">
              <span>{(o.shops as Record<string, unknown>)?.name as string} · <span className="text-ink-3">{o.status as string}/{o.escrow_status as string}</span></span>
              <b>{formatVND((o.total as number) || 0)}</b>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}
