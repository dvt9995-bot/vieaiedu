"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatVND } from "@/lib/format";
import { toast } from "@/components/Toaster";
import ShopCheckout from "@/components/shop/ShopCheckout";

interface CartItem { id: string; qty: number; variant: string | null; product_id: string; shop_products: { title: string; slug: string; price: number; type: string; media?: string[]; shipping_fee: number } }

export default function CartPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/shop/cart").then((x) => x.json()).catch(() => ({}));
    setItems(r.items || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setQty(id: string, qty: number) { await fetch("/api/shop/cart", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, qty }) }); load(); }
  async function remove(id: string) { await fetch(`/api/shop/cart?id=${id}`, { method: "DELETE" }); toast("Đã xóa"); load(); }

  if (items === null) return <div className="container-x py-16 text-center text-ink-3">Đang tải…</div>;
  const subtotal = items.reduce((n, it) => n + it.shop_products.price * it.qty, 0);
  const shipping = items.reduce((n, it) => n + (it.shop_products.type === "physical" ? it.shop_products.shipping_fee : 0), 0);
  const hasPhysical = items.some((it) => it.shop_products.type === "physical");

  return (
    <div className="container-x py-10 max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight mb-6">🛒 Giỏ hàng</h1>
      {items.length === 0 ? (
        <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Giỏ hàng trống. <Link href="/shop" className="text-accent font-semibold">Mua sắm ngay →</Link></div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-card border border-border bg-surface p-3">
              <div className="w-16 h-16 rounded-lg bg-bg-soft overflow-hidden shrink-0">
                {it.shop_products.media?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.shop_products.media[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/shop/p/${it.shop_products.slug}`} className="font-semibold text-sm hover:text-accent line-clamp-1">{it.shop_products.title}</Link>
                {it.variant && <div className="text-xs text-ink-3">{it.variant}</div>}
                <div className="font-bold text-accent text-sm mt-0.5">{formatVND(it.shop_products.price)}</div>
              </div>
              {it.shop_products.type === "physical" ? (
                <div className="flex items-center border border-border-strong rounded-lg text-sm shrink-0">
                  <button onClick={() => setQty(it.id, Math.max(1, it.qty - 1))} className="px-2.5 py-1 cursor-pointer">−</button>
                  <span className="px-2 tabular-nums">{it.qty}</span>
                  <button onClick={() => setQty(it.id, it.qty + 1)} className="px-2.5 py-1 cursor-pointer">+</button>
                </div>
              ) : <span className="text-xs text-ink-3 shrink-0">SỐ</span>}
              <button onClick={() => remove(it.id)} className="text-ink-3 hover:text-accent text-sm shrink-0 cursor-pointer">Xóa</button>
            </div>
          ))}
          <div className="rounded-card border border-border bg-surface p-5 mt-4">
            <div className="flex justify-between text-sm mb-1"><span className="text-ink-2">Tạm tính</span><span className="font-semibold">{formatVND(subtotal)}</span></div>
            {shipping > 0 && <div className="flex justify-between text-sm mb-1"><span className="text-ink-2">Phí vận chuyển</span><span className="font-semibold">{formatVND(shipping)}</span></div>}
            <div className="flex justify-between text-lg font-extrabold mt-2 pt-2 border-t border-border"><span>Tổng</span><span className="text-accent">{formatVND(subtotal + shipping)}</span></div>
            <div className="mt-4"><ShopCheckout needAddress={hasPhysical} label="Thanh toán" className="w-full rounded-full bg-accent hover:bg-accent-700 text-white font-semibold py-3 cursor-pointer disabled:opacity-60" /></div>
            <p className="text-center text-xs text-ink-3 mt-2">🛡️ Sàn giữ tiền tới khi bạn nhận hàng/sản phẩm · Thanh toán SePay</p>
          </div>
        </div>
      )}
    </div>
  );
}
