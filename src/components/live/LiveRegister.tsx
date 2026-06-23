"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthModal } from "@/components/AuthModal";
import { toast } from "@/components/Toaster";
import { enrollFree } from "@/lib/enroll";
import { track } from "@/lib/analytics";
import { formatVND } from "@/lib/format";

type Qr = { qrUrl: string; code: string; amount: number; orderId: string };

// Đăng ký lớp LIVE — ở lại trang landing, sau khi đăng ký hiện lịch + nút vào lớp.
export default function LiveRegister({ slug, title, price, comparePrice, enrolled, soldOut }: { slug: string; title?: string; price: number; comparePrice?: number; enrolled: boolean; soldOut?: boolean }) {
  const { open } = useAuthModal();
  const router = useRouter();
  // Phễu: xem sản phẩm (ViewContent) — bắn 1 lần khi mở trang
  useEffect(() => { track("view_item", { item_id: slug, item_name: title, value: price, currency: "VND" }); }, [slug, title, price]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState<Qr | null>(null);
  const [coupon, setCoupon] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const free = price === 0;
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);
  // Sau khi đăng nhập/đăng ký xong (quay lại đúng trang) → TỰ MỞ LẠI thanh toán, không bắt user tìm lại
  useEffect(() => {
    try { if (!enrolled && sessionStorage.getItem("vie:resumeBuy") === slug) { sessionStorage.removeItem("vie:resumeBuy"); setTimeout(() => onRegister(), 300); } } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (enrolled) return (
    <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success text-center">✓ Bạn đã đăng ký lớp này — xem lịch &amp; nút vào lớp bên dưới</div>
  );

  async function onRegister() {
    setBusy(true); setMsg("");
    track("begin_checkout", { item_id: slug, value: price, currency: "VND" });
    try {
      if (free) {
        const r = await enrollFree(slug);
        if (r.ok) { track("purchase", { item_id: slug, value: 0, method: "free" }); toast("Đăng ký thành công!"); return router.refresh(); }
        if (r.error === "auth") { try { sessionStorage.setItem("vie:resumeBuy", slug); } catch {} return open("register"); }
        return setMsg("Chưa đăng ký được, vui lòng thử lại.");
      }
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, couponCode: coupon, useWallet: true }) });
      if (res.status === 401) { try { sessionStorage.setItem("vie:resumeBuy", slug); } catch {} return open("register"); }
      const data = await res.json();
      if (data.enrolled) { toast("Đăng ký thành công!"); return router.refresh(); }
      if (!res.ok) return setMsg(data.error || "Có lỗi xảy ra.");
      setQr({ qrUrl: data.qrUrl, code: data.code, amount: data.amount, orderId: data.orderId });
      poll.current = setInterval(async () => {
        const s = await fetch(`/api/order/status?id=${data.orderId}`).then((r) => r.json()).catch(() => ({}));
        if (s.status === "paid") { if (poll.current) clearInterval(poll.current); track("purchase", { item_id: slug, value: data.amount, method: "sepay" }); toast("Thanh toán thành công!"); router.refresh(); }
      }, 4000);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-extrabold tracking-tight text-accent">{free ? "Miễn phí" : formatVND(price)}</span>
        {!free && comparePrice && comparePrice > price && <span className="text-ink-3 line-through">{formatVND(comparePrice)}</span>}
      </div>
      {!free && (
        <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Mã giảm giá (nếu có)" className="w-full mb-2 px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent uppercase" />
      )}
      <button onClick={onRegister} disabled={busy || soldOut} className="w-full rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold py-3.5 cursor-pointer transition-colors">
        {soldOut ? "Đã đầy chỗ" : busy ? "Đang xử lý…" : free ? "Đăng ký học miễn phí" : "Đăng ký & thanh toán"}
      </button>
      {msg && <p className="text-accent text-sm mt-2 text-center">{msg}</p>}
      <p className="text-center text-ink-3 text-xs mt-3">Học trực tiếp qua Google Meet · Link vào lớp mở 15 phút trước giờ học</p>

      {qr && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setQr(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-[360px] w-full text-center border border-border shadow-lg">
            <h3 className="text-lg font-extrabold">Quét QR để thanh toán</h3>
            <p className="text-ink-2 text-sm mt-1 mb-4">Chuyển khoản đúng số tiền &amp; nội dung. Hệ thống tự xác nhận sau vài giây.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.qrUrl} alt="QR SePay" className="w-56 h-56 mx-auto rounded-lg border border-border" />
            <div className="mt-4 text-sm space-y-1"><div>Số tiền: <b className="text-accent">{formatVND(qr.amount)}</b></div><div>Nội dung: <b className="font-mono">{qr.code}</b></div></div>
            <div className="flex items-center justify-center gap-2 mt-4 text-ink-3 text-sm"><span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Đang chờ thanh toán…</div>
            <button onClick={() => setQr(null)} className="mt-4 text-ink-3 text-sm hover:text-ink cursor-pointer">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
