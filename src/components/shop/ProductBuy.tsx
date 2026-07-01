"use client";
import { useState } from "react";
import { toast } from "@/components/Toaster";
import { formatVND } from "@/lib/format";
import { useAuthModal } from "@/components/AuthModal";
import Button from "@/components/ui/Button";
import ShopCheckout from "./ShopCheckout";

interface Opt { name: string; values: string[] }
interface Variant { label: string; price: number; stock: number }

export default function ProductBuy({ productId, type, price, options, variants, soldOut, favorited }: { productId: string; type: string; price: number; options?: Opt[]; variants?: Variant[]; soldOut?: boolean; favorited?: boolean }) {
  const { open } = useAuthModal();
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [vIdx, setVIdx] = useState(0);
  const [fav, setFav] = useState(!!favorited);
  const physical = type === "physical";
  const vs = variants || [];
  const hasVariants = vs.length > 0;
  const chosenV = hasVariants ? vs[vIdx] : null;

  // variant string: ưu tiên biến thể có giá; nếu không có thì gom options cũ
  const variant = hasVariants ? chosenV!.label
    : (options || []).length ? (options || []).map((o) => `${o.name}: ${sel[o.name] || o.values[0]}`).join(", ") : undefined;
  const outOfStock = soldOut || (chosenV ? chosenV.stock <= 0 : false);

  async function addToCart() {
    const res = await fetch("/api/shop/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId, qty, variant }) });
    if (res.status === 401) return open("register");
    if (res.ok) toast("Đã thêm vào giỏ"); else toast("Lỗi thêm giỏ");
  }
  async function toggleFav() {
    const r = await fetch("/api/shop/favorite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId }) });
    if (r.status === 401) return open("register");
    if (r.ok) { const d = await r.json(); setFav(!!d.favorited); }
  }

  return (
    <div className="space-y-3">
      {/* Biến thể có giá/kho riêng */}
      {hasVariants && (
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-1">Phân loại</label>
          <div className="flex gap-2 flex-wrap">
            {vs.map((v, i) => (
              <button key={i} onClick={() => setVIdx(i)} disabled={v.stock <= 0} className={`text-sm rounded-full border px-3.5 py-1.5 cursor-pointer transition-colors disabled:opacity-40 ${i === vIdx ? "border-accent bg-accent-weak text-accent font-semibold" : "border-border-strong text-ink-2 hover:border-accent"}`}>{v.label}{v.price > 0 && v.price !== price ? ` · ${formatVND(v.price)}` : ""}</button>
            ))}
          </div>
          {chosenV && <div className="text-xs text-ink-3 mt-1.5">Giá: <b className="text-accent">{formatVND(chosenV.price || price)}</b>{physical && ` · còn ${chosenV.stock}`}</div>}
        </div>
      )}
      {/* Tùy chọn hiển thị (không giá riêng) */}
      {!hasVariants && (options || []).map((o) => (
        <div key={o.name}>
          <label className="block text-xs font-semibold text-ink-2 mb-1">{o.name}</label>
          <div className="flex gap-2 flex-wrap">
            {o.values.map((v) => (
              <button key={v} onClick={() => setSel({ ...sel, [o.name]: v })} className={`text-sm rounded-full border px-3.5 py-1.5 cursor-pointer transition-colors ${(sel[o.name] || o.values[0]) === v ? "border-accent bg-accent-weak text-accent font-semibold" : "border-border-strong text-ink-2 hover:border-accent"}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      {physical && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-2">Số lượng</span>
          <div className="flex items-center border border-border-strong rounded-lg">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-1.5 cursor-pointer">−</button>
            <span className="px-3 text-sm font-semibold tabular-nums">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="px-3 py-1.5 cursor-pointer">+</button>
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <ShopCheckout items={[{ product_id: productId, qty, variant }]} needAddress={physical} label={price > 0 ? "Mua ngay" : "Nhận miễn phí"} className="flex-1" onAuthNeeded={() => {}} />
        <Button variant="secondary" size="lg" onClick={addToCart} disabled={outOfStock}>🛒 Giỏ</Button>
        <button onClick={toggleFav} aria-label="Yêu thích" className="rounded-full border border-border-strong px-3.5 text-lg cursor-pointer hover:border-accent">{fav ? "❤️" : "🤍"}</button>
      </div>
      {outOfStock && <p className="text-accent text-sm text-center">Sản phẩm tạm hết hàng</p>}
    </div>
  );
}
