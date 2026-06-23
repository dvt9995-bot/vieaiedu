"use client";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";

// Thanh CTA dính đáy màn hình (mobile) — luôn nhìn thấy nút mua khi cuộn nội dung dài.
export default function StickyCta({ price, soldOut }: { price: number; soldOut?: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <div className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border shadow-lg px-4 py-2.5 flex items-center gap-3 transition-transform ${show ? "translate-y-0" : "translate-y-full"}`} style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
      <div className="leading-tight">
        <div className="font-extrabold text-accent">{price > 0 ? formatVND(price) : "Miễn phí"}</div>
        <div className="text-[11px] text-ink-3">Học trực tiếp · còn chỗ</div>
      </div>
      <a href="#register" className={`flex-1 text-center rounded-full text-white font-semibold py-3 ${soldOut ? "bg-ink-3 pointer-events-none" : "bg-accent"}`}>
        {soldOut ? "Đã đầy chỗ" : "Đăng ký ngay →"}
      </a>
    </div>
  );
}
