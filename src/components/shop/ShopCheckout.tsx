"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/components/AuthModal";
import { toast } from "@/components/Toaster";
import { formatVND } from "@/lib/format";
import Button from "@/components/ui/Button";

type Qr = { qrUrl: string; code: string; amount: number };
export interface CoItem { product_id: string; qty: number; variant?: string }

// Nút + luồng thanh toán sàn: (địa chỉ nếu vật lý) → QR SePay → poll → Đơn của tôi.
export default function ShopCheckout({ items, needAddress, label, className, onAuthNeeded }: { items?: CoItem[]; needAddress?: boolean; label: string; className?: string; onAuthNeeded?: () => void }) {
  const { open } = useAuthModal();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<Qr | null>(null);
  const [addr, setAddr] = useState<{ name: string; phone: string; address: string } | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  async function go(ship?: { name: string; phone: string; address: string }) {
    setBusy(true);
    try {
      const res = await fetch("/api/shop/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, ship }) });
      if (res.status === 401) { onAuthNeeded?.(); return open("register"); }
      const d = await res.json();
      if (d.error === "need_address") { setAddr({ name: "", phone: "", address: "" }); return; }
      if (!res.ok) return toast(d.error || "Lỗi đặt hàng");
      setAddr(null);
      setQr({ qrUrl: d.qrUrl, code: d.code, amount: d.amount });
      poll.current = setInterval(async () => {
        const s = await fetch(`/api/shop/order-status?code=${d.code}`).then((r) => r.json()).catch(() => ({}));
        if (s.paid) { if (poll.current) clearInterval(poll.current); toast("Thanh toán thành công!"); router.push("/shop/orders"); }
      }, 4000);
    } finally { setBusy(false); }
  }

  return (
    <>
      <Button variant="primary" size="lg" onClick={() => (needAddress ? setAddr({ name: "", phone: "", address: "" }) : go())} disabled={busy} className={className}>
        {busy ? "Đang xử lý…" : label}
      </Button>

      {addr && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setAddr(null)}>
          <div className="bg-surface rounded-card border border-border shadow-lg w-full max-w-[420px] p-5">
            <h3 className="font-bold text-lg mb-3">Địa chỉ nhận hàng</h3>
            <div className="space-y-2">
              <input className="w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm" placeholder="Họ tên người nhận" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} />
              <input className="w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm" placeholder="Số điện thoại" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
              <textarea className="w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm" rows={2} placeholder="Địa chỉ chi tiết" value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="primary" onClick={() => { if (!addr.name || !addr.phone || !addr.address) return toast("Nhập đủ địa chỉ"); go(addr); }}>Tiếp tục</Button>
              <Button variant="secondary" onClick={() => setAddr(null)}>Hủy</Button>
            </div>
          </div>
        </div>
      )}

      {qr && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setQr(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-[360px] w-full text-center border border-border shadow-lg">
            <h3 className="text-lg font-extrabold">Quét QR để thanh toán</h3>
            <p className="text-ink-2 text-sm mt-1 mb-4">Chuyển đúng số tiền &amp; nội dung. Hệ thống tự xác nhận sau vài giây.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.qrUrl} alt="QR" className="w-56 h-56 mx-auto rounded-lg border border-border" />
            <div className="mt-4 text-sm space-y-1"><div>Số tiền: <b className="text-accent">{formatVND(qr.amount)}</b></div><div>Nội dung: <b className="font-mono">{qr.code}</b></div></div>
            <div className="flex items-center justify-center gap-2 mt-4 text-ink-3 text-sm"><span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Đang chờ thanh toán…</div>
            <button onClick={() => setQr(null)} className="mt-4 text-ink-3 text-sm hover:text-ink cursor-pointer">Đóng</button>
          </div>
        </div>
      )}
    </>
  );
}
