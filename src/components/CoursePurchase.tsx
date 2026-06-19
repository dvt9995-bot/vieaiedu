"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthModal } from "./AuthModal";
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
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const free = course.price === 0;

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function onBuy() {
    setBusy(true); setMsg("");
    try {
      if (free) {
        const r = await enrollFree(course.slug);
        if (r.ok) return router.push(`/learn/${course.slug}`);
        if (r.error === "auth") return open("login");
        return setMsg("Chưa thể ghi danh. Vui lòng đăng nhập.");
      }
      const res = await fetch("/api/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: course.slug }),
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
          <span className="text-3xl font-extrabold tracking-tight">{formatVND(course.price)}</span>
          {course.comparePrice && <span className="text-ink-3 line-through">{formatVND(course.comparePrice)}</span>}
        </div>
        <button onClick={onBuy} disabled={busy} className="w-full rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold py-3.5 cursor-pointer transition-colors">
          {busy ? "Đang xử lý…" : free ? "Học miễn phí ngay" : "Mua khóa học"}
        </button>
        <button onClick={() => setLiked(!liked)} className={`w-full mt-2.5 rounded-full border font-semibold py-3 cursor-pointer transition-colors ${liked ? "border-accent text-accent bg-accent-weak" : "border-border-strong text-ink-2 hover:border-ink-3"}`}>
          {liked ? "★ Đã lưu yêu thích" : "☆ Lưu vào yêu thích"}
        </button>
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
