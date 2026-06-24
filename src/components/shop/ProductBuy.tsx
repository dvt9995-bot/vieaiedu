"use client";
import { useState } from "react";
import { toast } from "@/components/Toaster";
import { useAuthModal } from "@/components/AuthModal";
import ShopCheckout from "./ShopCheckout";

interface Opt { name: string; values: string[] }
export default function ProductBuy({ productId, type, price, options, soldOut }: { productId: string; type: string; price: number; options?: Opt[]; soldOut?: boolean }) {
  const { open } = useAuthModal();
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string>>({});
  const physical = type === "physical";
  const variant = (options || []).length ? (options || []).map((o) => `${o.name}: ${sel[o.name] || o.values[0]}`).join(", ") : undefined;

  async function addToCart() {
    const res = await fetch("/api/shop/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId, qty, variant }) });
    if (res.status === 401) return open("register");
    if (res.ok) toast("Đã thêm vào giỏ"); else toast("Lỗi thêm giỏ");
  }

  return (
    <div className="space-y-3">
      {(options || []).map((o) => (
        <div key={o.name}>
          <label className="block text-xs font-semibold text-ink-2 mb-1">{o.name}</label>
          <div className="flex gap-2 flex-wrap">
            {o.values.map((v) => (
              <button key={v} onClick={() => setSel({ ...sel, [o.name]: v })} className={`text-sm rounded-lg border px-3 py-1.5 cursor-pointer ${(sel[o.name] || o.values[0]) === v ? "border-accent bg-accent-weak text-accent font-semibold" : "border-border-strong text-ink-2"}`}>{v}</button>
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
        <ShopCheckout items={[{ product_id: productId, qty, variant }]} needAddress={physical} label={price > 0 ? "Mua ngay" : "Nhận miễn phí"} className="flex-1 rounded-full bg-accent hover:bg-accent-700 text-white font-semibold py-3 cursor-pointer disabled:opacity-60" onAuthNeeded={() => {}} />
        <button onClick={addToCart} disabled={soldOut} className="rounded-full border border-border-strong hover:border-accent font-semibold px-5 py-3 cursor-pointer disabled:opacity-60">🛒 Giỏ</button>
      </div>
      {soldOut && <p className="text-accent text-sm text-center">Sản phẩm tạm hết hàng</p>}
    </div>
  );
}
