"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "@/components/Toaster";
import { formatVND } from "@/lib/format";
import ImageUpload from "@/components/ImageUpload";
import GalleryUpload from "@/components/GalleryUpload";

interface Shop { id: string; name: string; status: string; slug: string; description?: string; logo_url?: string; pickup_name?: string; pickup_phone?: string; pickup_address?: string }
interface Cat { id: string; name: string; fee_percent: number }
interface Product { id: string; title: string; type: string; price: number; status: string; review_status: string; review_note?: string; sold_count: number; stock?: number | null }
interface OrderItem { title: string; qty: number; variant?: string | null; shop_products?: { weight?: number | null; dimensions?: string | null } | null }
interface Order { id: string; code?: string; total: number; subtotal?: number; shipping_fee?: number; status: string; carrier?: string | null; tracking_code?: string | null; has_physical: boolean; ship_name?: string; ship_phone?: string; ship_address?: string; shop_order_items: OrderItem[] }

const empty = { type: "digital", title: "", description: "", price: "0", compare_price: "", category_id: "", stock: "", shipping_fee: "0", weight: "", dimensions: "", media: [] as string[], digital_url: "", digital_note: "", optionsText: "" };

export default function SellerStudio() {
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ov, setOv] = useState<{ revenue: number; pending_escrow: number; received: number; orders: number } | null>(null);
  const [lowStock, setLowStock] = useState<{ title: string; stock: number }[]>([]);
  const [reg, setReg] = useState({ name: "", description: "", logo_url: "" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopForm, setShopForm] = useState({ name: "", description: "", logo_url: "", pickup_name: "", pickup_phone: "", pickup_address: "" });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadAll = useCallback(async () => {
    const [p, o, ovr] = await Promise.all([
      fetch("/api/shop/products").then((r) => r.json()).catch(() => ({})),
      fetch("/api/seller/orders").then((r) => r.json()).catch(() => ({})),
      fetch("/api/seller/overview").then((r) => r.json()).catch(() => ({})),
    ]);
    setProducts(p.products || []); setOrders(o.orders || []); setOv(ovr.overview || null); setLowStock(ovr.lowStock || []);
  }, []);
  useEffect(() => {
    (async () => {
      const [r, c] = await Promise.all([fetch("/api/shop/register").then((x) => x.json()).catch(() => ({})), fetch("/api/shop/categories").then((x) => x.json()).catch(() => ({}))]);
      setShop(r.shop || null); setCats(c.categories || []);
      if (r.shop?.status === "approved") await loadAll();
      setLoading(false);
    })();
  }, [loadAll]);

  async function register() {
    if (!reg.name.trim()) return toast("Nhập tên shop");
    const res = await fetch("/api/shop/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reg) });
    const d = await res.json(); if (!res.ok) return toast(d.error || "Lỗi");
    toast("Đã gửi đăng ký — chờ duyệt"); setShop({ id: "", name: reg.name, status: "pending", slug: "" });
  }

  function openNew() { setEditId(null); setForm(empty); setEditing(true); }
  function openEdit(p: Product & Record<string, unknown>) {
    setEditId(p.id);
    setForm({ type: p.type, title: p.title, description: (p.description as string) || "", price: String(p.price || 0), compare_price: p.compare_price ? String(p.compare_price) : "", category_id: (p.category_id as string) || "", stock: p.stock != null ? String(p.stock) : "", shipping_fee: String((p.shipping_fee as number) || 0), weight: p.weight != null ? String(p.weight) : "", dimensions: (p.dimensions as string) || "", media: Array.isArray(p.media) ? (p.media as string[]) : [], digital_url: (p.digital_url as string) || "", digital_note: (p.digital_note as string) || "", optionsText: Array.isArray(p.options) ? (p.options as { name: string; values: string[] }[]).map((o) => `${o.name}: ${o.values.join(", ")}`).join("\n") : "" });
    setEditing(true);
  }
  async function save() {
    if (!form.title.trim()) return toast("Nhập tên sản phẩm");
    const options = form.optionsText.split("\n").map((l) => { const i = l.indexOf(":"); return i < 0 ? null : { name: l.slice(0, i).trim(), values: l.slice(i + 1).split(",").map((v) => v.trim()).filter(Boolean) }; }).filter((x): x is { name: string; values: string[] } => !!x && x.values.length > 0);
    const body = { ...form, options, ...(editId ? { id: editId } : {}) };
    const res = await fetch("/api/shop/products", { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json(); if (!res.ok) return toast(d.error || "Lỗi");
    toast(editId ? "Đã lưu" : "Đã tạo sản phẩm (nháp)"); setEditing(false); loadAll();
  }
  async function submitReview(id: string) { await fetch("/api/shop/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action: "submit" }) }); toast("Đã gửi duyệt"); loadAll(); }
  async function del(id: string) { if (!confirm("Xóa sản phẩm?")) return; await fetch(`/api/shop/products?id=${id}`, { method: "DELETE" }); toast("Đã xóa"); loadAll(); }
  async function ship(o: Order) {
    const carrier = prompt("Hãng vận chuyển (nhập: ghn / ghtk / vtp / jt / spx / vnpost / other):", "ghn");
    if (carrier === null) return;
    const t = prompt("Mã vận đơn:") || "";
    await fetch("/api/seller/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, tracking_code: t, carrier: carrier.trim().toLowerCase() }) });
    toast("Đã đánh dấu giao hàng"); loadAll();
  }
  function openSettings() { setShopForm({ name: shop?.name || "", description: shop?.description || "", logo_url: shop?.logo_url || "", pickup_name: shop?.pickup_name || "", pickup_phone: shop?.pickup_phone || "", pickup_address: shop?.pickup_address || "" }); setSettingsOpen(true); }
  async function saveShop() {
    if (!shopForm.name.trim()) return toast("Nhập tên shop");
    const res = await fetch("/api/shop/register", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(shopForm) });
    const d = await res.json(); if (!res.ok) return toast(d.error || "Lỗi");
    setShop((s) => s ? { ...s, ...shopForm } : s); setSettingsOpen(false); toast("Đã lưu hồ sơ shop");
  }
  // Thông tin giao hàng để chủ shop copy sang app vận chuyển (GHN/GHTK…)
  function shipInfo(o: Order) {
    const items = o.shop_order_items.map((it) => `- ${it.title}${it.variant ? ` (${it.variant})` : ""} ×${it.qty}${it.shop_products?.weight ? ` · ${it.shop_products.weight}g` : ""}${it.shop_products?.dimensions ? ` · ${it.shop_products.dimensions}` : ""}`).join("\n");
    const totalW = o.shop_order_items.reduce((n, it) => n + ((it.shop_products?.weight || 0) * it.qty), 0);
    return `ĐƠN ${o.code || o.id.slice(0, 8)}\n— NGƯỜI NHẬN —\n${o.ship_name || ""} · ${o.ship_phone || ""}\n${o.ship_address || ""}\n— HÀNG —\n${items}\nTổng KL: ${totalW ? totalW + "g" : "(chưa nhập)"}\nThu hộ (COD): 0đ (đã thanh toán online)`;
  }
  async function copyShip(o: Order) { try { await navigator.clipboard.writeText(shipInfo(o)); toast("Đã copy thông tin giao hàng ✓"); } catch { toast("Không copy được"); } }

  const inp = "w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  if (loading) return <div className="container-x py-16 text-center text-ink-3">Đang tải…</div>;

  // Chưa có shop / chờ duyệt
  if (!shop) return (
    <div className="container-x py-12 max-w-xl">
      <div className="text-xs uppercase tracking-wider text-accent font-semibold">Kênh người bán</div>
      <h1 className="text-3xl font-extrabold tracking-tight mt-1">Mở shop trên VIE AI EDU</h1>
      <p className="text-ink-2 mt-2">Bán sản phẩm số (file, công cụ, template) hoặc vật lý. Sàn giữ tiền an toàn, giải ngân về ví sau khi giao thành công.</p>
      <div className="mt-6 space-y-3">
        <div><label className="block text-xs font-semibold text-ink-2 mb-1">Logo shop (tùy chọn)</label><ImageUpload value={reg.logo_url} onChange={(u) => setReg({ ...reg, logo_url: u })} endpoint="/api/shop/upload" placeholder="Tải logo" /></div>
        <input className={inp} placeholder="Tên shop *" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} />
        <textarea className={inp} rows={3} placeholder="Giới thiệu shop" value={reg.description} onChange={(e) => setReg({ ...reg, description: e.target.value })} />
        <button onClick={register} className="w-full rounded-full bg-accent hover:bg-accent-700 text-white font-semibold py-3 cursor-pointer">Gửi đăng ký mở shop</button>
      </div>
    </div>
  );
  if (shop.status === "pending") return <div className="container-x py-16 max-w-xl text-center"><div className="text-5xl mb-3">⏳</div><h1 className="text-2xl font-extrabold">Shop đang chờ duyệt</h1><p className="text-ink-2 mt-2">Quản trị viên sẽ duyệt sớm. Bạn sẽ nhận thông báo khi được duyệt.</p></div>;
  if (shop.status === "suspended") return <div className="container-x py-16 max-w-xl text-center"><h1 className="text-2xl font-extrabold text-accent">Shop tạm khóa</h1><p className="text-ink-2 mt-2">Liên hệ quản trị để biết thêm.</p></div>;

  return (
    <div className="container-x py-8">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><div className="text-xs uppercase tracking-wider text-accent font-semibold">Kênh người bán</div><h1 className="text-2xl font-extrabold tracking-tight">{shop.name}</h1></div>
        <div className="flex gap-2">
          <button onClick={openSettings} className="rounded-full border border-border-strong text-sm font-semibold px-4 py-2 cursor-pointer">⚙ Cài đặt shop</button>
          <Link href="/wallet" className="rounded-full border border-border-strong text-sm font-semibold px-4 py-2">💰 Ví &amp; rút tiền</Link>
          {tab === "products" && <button onClick={openNew} className="rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold px-4 py-2 cursor-pointer">+ Sản phẩm</button>}
        </div>
      </div>
      {!shop.pickup_address && <div className="rounded-lg bg-accent-weak text-accent text-sm px-4 py-2.5 mb-4 flex items-center justify-between gap-3"><span>📍 Bạn chưa khai báo <b>địa chỉ kho lấy hàng</b> — cần để tạo vận đơn. <button onClick={openSettings} className="underline font-semibold cursor-pointer">Khai báo ngay</button></span></div>}
      {/* Dashboard doanh thu */}
      {ov && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[["💰 Tiền đã nhận (ví)", formatVND(ov.received)], ["🔒 Chờ giải ngân", formatVND(ov.pending_escrow)], ["📊 Tổng doanh thu", formatVND(ov.revenue)], ["🧾 Đơn đã bán", String(ov.orders)]].map(([l, v], i) => (
            <div key={i} className="rounded-card border border-border bg-surface p-4"><div className="text-xl font-extrabold tracking-tight">{v}</div><div className="text-ink-3 text-xs mt-0.5">{l}</div></div>
          ))}
        </div>
      )}
      {lowStock.length > 0 && <div className="rounded-lg bg-gold/15 border border-gold/40 text-amber-700 text-sm px-4 py-2 mb-4">⚠️ Sắp hết hàng: {lowStock.map((p) => `${p.title} (còn ${p.stock})`).join(", ")}</div>}

      <div className="flex gap-2 mb-4">
        {(["products", "orders"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`text-sm font-semibold rounded-full px-4 py-2 cursor-pointer ${tab === t ? "bg-accent-weak text-accent" : "text-ink-2"}`}>{t === "products" ? "Sản phẩm" : `Đơn hàng (${orders.length})`}</button>)}
      </div>

      {tab === "products" ? (
        products.length === 0 ? <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Chưa có sản phẩm. Bấm “+ Sản phẩm”.</div> : (
          <div className="grid gap-2">
            {products.map((p) => (
              <div key={p.id} className="rounded-card border border-border bg-surface p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold text-sm">{p.title} <span className="text-xs text-ink-3">· {p.type === "digital" ? "Số" : "Vật lý"} · {formatVND(p.price)}</span></div>
                  <div className="text-xs">
                    <span className={p.review_status === "approved" ? "text-success" : p.review_status === "rejected" ? "text-accent" : "text-amber-700"}>{p.review_status === "approved" ? "✓ Đã duyệt" : p.review_status === "rejected" ? "Bị từ chối" : p.status === "draft" ? "Nháp" : "Chờ duyệt"}</span>
                    <span className="text-ink-3"> · đã bán {p.sold_count}</span>{p.review_note ? <span className="text-accent"> · {p.review_note}</span> : null}
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => openEdit(p as Product & Record<string, unknown>)} className="font-semibold text-ink-2 hover:text-ink cursor-pointer">Sửa</button>
                  {(p.status === "draft" || p.review_status === "rejected") && <button onClick={() => submitReview(p.id)} className="font-semibold text-success cursor-pointer">Gửi duyệt</button>}
                  <button onClick={() => del(p.id)} className="text-ink-3 hover:text-accent cursor-pointer">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        orders.length === 0 ? <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Chưa có đơn nào.</div> : (
          <div className="grid gap-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-card border border-border bg-surface p-4">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold text-sm">{o.code ? <span className="text-ink-3 font-normal">#{o.code} · </span> : null}{formatVND(o.total)}</span><span className={`text-xs ${o.status === "paid" ? "text-amber-700" : o.status === "shipped" ? "text-accent" : "text-ink-3"}`}>{o.status === "paid" ? "Chờ giao" : o.status === "shipped" ? "Đang giao" : o.status}</span></div>
                {o.shop_order_items.map((it, i) => <div key={i} className="text-sm text-ink-2">{it.title}{it.variant ? <span className="text-ink-3"> ({it.variant})</span> : null} ×{it.qty}{it.shop_products?.weight ? <span className="text-ink-3 text-xs"> · {it.shop_products.weight}g</span> : null}</div>)}
                {o.has_physical && (
                  <div className="mt-2 rounded-lg bg-bg-soft border border-border p-2.5 text-xs">
                    <div className="font-semibold text-ink">📍 Giao tới:</div>
                    <div className="text-ink-2">{o.ship_name} · {o.ship_phone}</div>
                    <div className="text-ink-2">{o.ship_address}</div>
                  </div>
                )}
                {o.tracking_code && <div className="text-xs text-ink-3 mt-1.5">🚚 {o.carrier?.toUpperCase()} · {o.tracking_code}</div>}
                {o.has_physical && o.status === "paid" && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => copyShip(o)} className="rounded-full border border-border-strong text-xs font-semibold px-4 py-1.5 cursor-pointer">📋 Copy thông tin giao</button>
                    <button onClick={() => ship(o)} className="rounded-full bg-ink text-white text-xs font-semibold px-4 py-1.5 cursor-pointer">📦 Đã gửi hàng + mã VĐ</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal SP */}
      {editing && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setEditing(false)}>
          <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[560px] max-h-[88vh] overflow-auto p-5">
            <h3 className="font-bold text-lg mb-3">{editId ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[["digital", "📦 Sản phẩm số"], ["physical", "🚚 Vật lý"]].map(([v, l]) => <button key={v} type="button" onClick={() => setForm({ ...form, type: v })} className={`rounded-lg border py-2 text-sm font-semibold cursor-pointer ${form.type === v ? "border-accent bg-accent-weak text-accent" : "border-border-strong text-ink-2"}`}>{l}</button>)}
              </div>
              <input className={inp} placeholder="Tên sản phẩm *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div><label className="block text-[11px] text-ink-3 mb-1">Ảnh sản phẩm (nhiều ảnh)</label><GalleryUpload value={form.media} onChange={(u) => setForm({ ...form, media: u })} endpoint="/api/shop/upload" /></div>
              <textarea className={inp} rows={4} placeholder="Mô tả (hỗ trợ Markdown)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select className={inp} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">— Danh mục —</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name} (phí {c.fee_percent}%)</option>)}</select>
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} type="number" placeholder="Giá bán (đ)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <input className={inp} type="number" placeholder="Giá gốc (gạch ngang)" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} />
              </div>
              {form.type === "physical" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inp} type="number" placeholder="Tồn kho" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                    <input className={inp} type="number" placeholder="Phí ship (đ) — 0 = freeship/thu khi giao" value={form.shipping_fee} onChange={(e) => setForm({ ...form, shipping_fee: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inp} type="number" placeholder="Cân nặng (gram)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                    <input className={inp} placeholder="Kích thước D×R×C (cm)" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} />
                  </div>
                  <p className="text-[11px] text-ink-3">💡 Cân nặng &amp; kích thước giúp bạn tạo vận đơn chính xác trên app GHN/GHTK. Phí ship không bắt buộc.</p>
                </>
              ) : (
                <>
                  <input className={inp} placeholder="Link giao (Google Drive…) — hoặc tải file bên dưới" value={form.digital_url.startsWith("file:") ? "📎 (đã tải file lên — bảo mật)" : form.digital_url} onChange={(e) => setForm({ ...form, digital_url: e.target.value })} readOnly={form.digital_url.startsWith("file:")} />
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-border-strong px-3 py-2 w-fit">⬆ Tải file số (bảo mật)<input type="file" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; toast("Đang tải file…"); const ext = (f.name.split(".").pop() || "zip"); const sig = await fetch("/api/shop/signed-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ext }) }).then((x) => x.json()); if (!sig.token) return toast("Lỗi tạo link"); const { createClient } = await import("@/lib/supabase/client"); const c = createClient(); const { error } = await c!.storage.from(sig.bucket).uploadToSignedUrl(sig.path, sig.token, f); if (error) return toast("Tải lỗi: " + error.message); setForm((cur) => ({ ...cur, digital_url: sig.value })); toast("Đã tải file ✓ (bảo mật)"); e.currentTarget.value = ""; }} /></label>
                  {form.digital_url.startsWith("file:") && <button type="button" onClick={() => setForm({ ...form, digital_url: "" })} className="text-xs text-accent cursor-pointer w-fit">Xóa file đã tải</button>}
                  <textarea className={inp} rows={2} placeholder="Hướng dẫn/license cho người mua (hiện sau khi mua)" value={form.digital_note} onChange={(e) => setForm({ ...form, digital_note: e.target.value })} />
                </>
              )}
              <div><label className="block text-[11px] text-ink-3 mb-1">Phân loại/biến thể — mỗi dòng: <code className="bg-bg-soft px-1 rounded">Tên: giá trị1, giá trị2</code></label><textarea className={`${inp} font-mono`} rows={2} placeholder={"Size: S, M, L\nMàu: Đen, Trắng"} value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} /></div>
              <div className="flex gap-2 pt-1"><button onClick={save} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer">{editId ? "Lưu" : "Tạo"}</button><button onClick={() => setEditing(false)} className="rounded-full border border-border-strong text-sm px-4 py-2.5 cursor-pointer">Hủy</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cài đặt shop */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}>
          <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[480px] max-h-[88vh] overflow-auto p-5">
            <h3 className="font-bold text-lg mb-1">Cài đặt shop</h3>
            <div className="space-y-3 mt-3">
              <div><label className="block text-[11px] text-ink-3 mb-1">Logo shop</label><ImageUpload value={shopForm.logo_url} onChange={(u) => setShopForm({ ...shopForm, logo_url: u })} endpoint="/api/shop/upload" placeholder="Tải logo" /></div>
              <input className={inp} placeholder="Tên shop *" value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} />
              <textarea className={inp} rows={2} placeholder="Giới thiệu shop" value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })} />
              <div className="pt-2 border-t border-border">
                <div className="text-sm font-semibold mb-1">📍 Địa chỉ kho lấy hàng</div>
                <p className="text-[11px] text-ink-3 mb-2">Dùng làm điểm lấy hàng khi bạn tạo vận đơn (GHN/GHTK…).</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inp} placeholder="Tên người gửi" value={shopForm.pickup_name} onChange={(e) => setShopForm({ ...shopForm, pickup_name: e.target.value })} />
                    <input className={inp} placeholder="SĐT lấy hàng" value={shopForm.pickup_phone} onChange={(e) => setShopForm({ ...shopForm, pickup_phone: e.target.value })} />
                  </div>
                  <textarea className={inp} rows={2} placeholder="Địa chỉ kho (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành)" value={shopForm.pickup_address} onChange={(e) => setShopForm({ ...shopForm, pickup_address: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-1"><button onClick={saveShop} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer">Lưu</button><button onClick={() => setSettingsOpen(false)} className="rounded-full border border-border-strong text-sm px-4 py-2.5 cursor-pointer">Hủy</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
