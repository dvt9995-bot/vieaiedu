"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthModal } from "./AuthModal";
import ShareCourseButton from "./ShareCourseButton";
import DonateButton from "./DonateButton";
import { toast } from "./Toaster";
import { favoritesCached, toggleFavorite, invalidateFavorites } from "@/lib/db";
import { track } from "@/lib/analytics";
import { enrollFree } from "@/lib/enroll";
import { formatVND } from "@/lib/format";
import type { Course } from "@/lib/types";

type Qr = { qrUrl: string; code: string; amount: number; orderId: string };

export default function CoursePurchase({ course }: { course: Course }) {
  const { open } = useAuthModal();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<Qr | null>(null);
  const [msg, setMsg] = useState("");
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [wallet, setWallet] = useState(0);
  const [useWallet, setUseWallet] = useState(true);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const free = course.price === 0;

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  // Số dư ví (để giảm trừ khi mua)
  useEffect(() => { if (!free) fetch("/api/wallet").then((r) => r.json()).then((d) => setWallet(d.total || 0)).catch(() => {}); }, [free]);

  // Tải trạng thái yêu thích (DB nếu đăng nhập, ngược lại localStorage)
  useEffect(() => { favoritesCached().then((favs) => setLiked(favs.includes(course.slug))); }, [course.slug]);

  // Phễu: xem khóa học
  useEffect(() => { track("view_item", { item_id: course.slug, item_name: course.title, price: course.price, currency: "VND" }); }, [course.slug, course.title, course.price]);

  async function onToggleFavorite() {
    const next = !liked;
    setLiked(next);
    await toggleFavorite(course.slug, next);
    invalidateFavorites();
    if (next) track("add_to_wishlist", { item_id: course.slug, item_name: course.title });
    toast(next ? "Đã lưu vào yêu thích" : "Đã bỏ khỏi yêu thích");
  }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    const r = await fetch("/api/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: coupon }) }).then((x) => x.json()).catch(() => ({}));
    if (r.valid) { setDiscount(r.percentOff); setCouponMsg(`Đã áp mã: giảm ${r.percentOff}%`); }
    else { setDiscount(0); setCouponMsg("Mã không hợp lệ hoặc đã hết hạn"); }
  }

  async function onBuy() {
    setBusy(true); setMsg("");
    track("begin_checkout", { item_id: course.slug, item_name: course.title, value: course.price, currency: "VND" });
    try {
      if (free) {
        const r = await enrollFree(course.slug);
        if (r.ok) { track("purchase", { item_id: course.slug, value: 0, currency: "VND", method: "free" }); return router.push(`/learn/${course.slug}`); }
        if (r.error === "auth") return open("login");
        return setMsg(r.error === "not_free" ? "Khóa này không miễn phí." : "Chưa ghi danh được, vui lòng thử lại.");
      }
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: course.slug, couponCode: coupon, useWallet }),
      });
      if (res.status === 401) return open("login");
      const data = await res.json();
      if (data.enrolled) return router.push(`/learn/${course.slug}`);
      if (!res.ok) return setMsg(data.error || "Có lỗi xảy ra.");
      setQr({ qrUrl: data.qrUrl, code: data.code, amount: data.amount, orderId: data.orderId });
      // poll trạng thái đơn
      poll.current = setInterval(async () => {
        const s = await fetch(`/api/order/status?id=${data.orderId}`).then((r) => r.json()).catch(() => ({}));
        if (s.status === "paid") {
          if (poll.current) clearInterval(poll.current);
          track("purchase", { item_id: course.slug, value: data.amount, currency: "VND", method: "sepay" });
          router.push(`/learn/${course.slug}`);
        }
      }, 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface shadow-lg overflow-hidden lg:sticky lg:top-24">
      <div className="relative aspect-video bg-bg-soft flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={course.thumb} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur border border-border shadow-soft flex items-center justify-center z-10"><svg viewBox="0 0 24 24" className="w-5 h-5 ml-0.5 fill-accent"><path d="M8 5v14l11-7z" /></svg></div>
      </div>
      <div className="p-5">
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-extrabold tracking-tight">{formatVND(discount > 0 ? Math.round(course.price * (1 - discount / 100)) : course.price)}</span>
          {discount > 0 ? <span className="text-ink-3 line-through">{formatVND(course.price)}</span>
            : course.comparePrice && <span className="text-ink-3 line-through">{formatVND(course.comparePrice)}</span>}
          {discount > 0 && <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">-{discount}%</span>}
        </div>

        {!free && (
          <div className="mb-3">
            <div className="flex gap-2">
              <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Mã giảm giá" className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent uppercase" />
              <button onClick={applyCoupon} className="rounded-lg border border-border-strong hover:border-accent text-sm font-semibold px-3.5 cursor-pointer">Áp dụng</button>
            </div>
            {couponMsg && <p className={`text-xs mt-1.5 ${discount > 0 ? "text-success" : "text-accent"}`}>{couponMsg}</p>}
          </div>
        )}

        {/* Dùng số dư ví */}
        {!free && wallet > 0 && (() => {
          const price = discount > 0 ? Math.round(course.price * (1 - discount / 100)) : course.price;
          const used = useWallet ? Math.min(wallet, price) : 0;
          return (
            <label className="flex items-start gap-2.5 mb-3 p-3 rounded-lg border border-border bg-bg-soft cursor-pointer">
              <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="mt-0.5" />
              <span className="text-sm">
                Dùng số dư ví <b className="text-accent">{formatVND(wallet)}</b>
                {useWallet && <span className="block text-ink-3 text-xs mt-0.5">Trừ {formatVND(used)} · còn phải trả <b className="text-ink">{formatVND(price - used)}</b></span>}
              </span>
            </label>
          );
        })()}

        <button onClick={onBuy} disabled={busy} className="w-full rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold py-3.5 cursor-pointer transition-colors">
          {busy ? "Đang xử lý…" : free ? "Học miễn phí ngay" : "Mua khóa học"}
        </button>
        <button onClick={onToggleFavorite} className={`w-full mt-2.5 rounded-full border font-semibold py-3 cursor-pointer transition-colors ${liked ? "border-accent text-accent bg-accent-weak" : "border-border-strong text-ink-2 hover:border-ink-3"}`}>
          {liked ? "★ Đã lưu yêu thích" : "☆ Lưu vào yêu thích"}
        </button>
        <ShareCourseButton slug={course.slug} title={course.title} />
        <div className="mt-2.5"><DonateButton courseSlug={course.slug} /></div>
        {msg && <p className="text-accent text-sm mt-3 text-center">{msg}</p>}
        {!free && <p className="text-center text-ink-3 text-xs mt-3">Thanh toán an toàn qua SePay · Truy cập trọn đời</p>}
        <ul className="mt-5 pt-5 border-t border-border space-y-2.5 text-sm text-ink-2">
          <li>✓ {course.lessonsCount} bài học video</li>
          <li>✓ Tài liệu &amp; mã nguồn tải về</li>
          <li>✓ Bài kiểm tra &amp; chứng chỉ hoàn thành</li>
          <li>✓ Học trên web và điện thoại</li>
        </ul>
      </div>

      {/* QR thanh toán */}
      {qr && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setQr(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-[360px] w-full text-center border border-border shadow-lg">
            <h3 className="text-lg font-extrabold">Quét QR để thanh toán</h3>
            <p className="text-ink-2 text-sm mt-1 mb-4">Chuyển khoản đúng số tiền &amp; nội dung. Hệ thống tự xác nhận sau vài giây.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.qrUrl} alt="QR SePay" className="w-56 h-56 mx-auto rounded-lg border border-border" />
            <div className="mt-4 text-sm space-y-1">
              <div>Số tiền: <b className="text-accent">{formatVND(qr.amount)}</b></div>
              <div>Nội dung: <b className="font-mono">{qr.code}</b></div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-ink-3 text-sm">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Đang chờ thanh toán…
            </div>
            <button onClick={() => setQr(null)} className="mt-4 text-ink-3 text-sm hover:text-ink cursor-pointer">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
