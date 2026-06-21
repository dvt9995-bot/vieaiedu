"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { formatVND } from "@/lib/format";
import { track } from "@/lib/analytics";

type Qr = { qrUrl: string; code: string; amount: number; orderId: string };

export default function BundleCTA({ price, compare, title }: { price: number; compare: number; title: string }) {
  const { open } = useAuthModal();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<Qr | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const save = compare > price ? Math.round((1 - price / compare) * 100) : 0;

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function buy() {
    setBusy(true);
    track("begin_checkout", { item_id: "all-access", item_name: title, value: price, currency: "VND" });
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: "all-access", useWallet: true }) });
      if (res.status === 401) return open("login");
      const data = await res.json();
      if (data.enrolled) { track("purchase", { item_id: "all-access", value: price, currency: "VND" }); return router.push("/courses"); }
      if (!res.ok) return;
      setQr(data);
      poll.current = setInterval(async () => {
        const s = await fetch(`/api/order/status?id=${data.orderId}`).then((r) => r.json()).catch(() => ({}));
        if (s.status === "paid") { if (poll.current) clearInterval(poll.current); track("purchase", { item_id: "all-access", value: data.amount, currency: "VND" }); router.push("/courses"); }
      }, 4000);
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-card border border-accent/30 bg-gradient-to-br from-accent-weak to-surface p-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-accent bg-surface border border-accent/30 px-2.5 py-1 rounded-full mb-2">🎁 Ưu đãi trọn bộ {save > 0 && `· Tiết kiệm ${save}%`}</div>
        <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-2xl font-extrabold text-accent">{formatVND(price)}</span>
          {compare > price && <span className="text-ink-3 line-through">{formatVND(compare)}</span>}
          <span className="text-ink-2 text-sm">· học tất cả khóa, trọn đời</span>
        </div>
      </div>
      <button onClick={buy} disabled={busy} className="shrink-0 rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-7 py-3.5 cursor-pointer disabled:opacity-60">{busy ? "Đang xử lý…" : "Sở hữu trọn bộ"}</button>

      {qr && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setQr(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-[360px] w-full text-center border border-border shadow-lg">
            <h3 className="text-lg font-extrabold">Quét QR để thanh toán</h3>
            <p className="text-ink-2 text-sm mt-1 mb-4">Chuyển đúng số tiền &amp; nội dung. Hệ thống tự xác nhận sau vài giây.</p>
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
