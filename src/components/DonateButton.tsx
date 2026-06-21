"use client";
import { useEffect, useRef, useState } from "react";
import { formatVND } from "@/lib/format";
import { toast } from "./Toaster";
import { track } from "@/lib/analytics";

const PRESETS = [20000, 50000, 100000, 200000, 500000];

export default function DonateButton({ courseSlug, variant = "block" }: { courseSlug?: string; variant?: "block" | "inline" }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(50000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState<{ qrUrl: string; code: string; amount: number; id: string } | null>(null);
  const [paid, setPaid] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);
  const value = custom ? Math.round(Number(custom) || 0) : amount;

  function reset() { setQr(null); setPaid(false); setMessage(""); setCustom(""); setAmount(50000); if (poll.current) clearInterval(poll.current); }
  function close() { setOpen(false); reset(); }

  async function createDonation() {
    if (value < 10000) return toast("Số tiền ủng hộ tối thiểu 10.000đ", "error");
    setBusy(true);
    const r = await fetch("/api/donate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: value, message, courseSlug }) }).then((x) => x.json()).catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast(r.error || "Không tạo được mã ủng hộ", "error");
    setQr({ qrUrl: r.qrUrl, code: r.code, amount: r.amount, id: r.id });
    track("donate_start", { value: r.amount, currency: "VND", course: courseSlug || "" });
    poll.current = setInterval(async () => {
      const s = await fetch(`/api/donate/status?id=${r.id}`).then((x) => x.json()).catch(() => ({}));
      if (s.status === "paid") { if (poll.current) clearInterval(poll.current); setPaid(true); track("donate", { value: r.amount, currency: "VND" }); }
    }, 4000);
  }

  const btnCls = variant === "inline"
    ? "inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-700 cursor-pointer"
    : "w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-accent text-accent hover:bg-accent-weak font-semibold py-3 cursor-pointer transition-colors";

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnCls}>
        <span>❤️</span> Ủng hộ cộng đồng
      </button>

      {open && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="w-full max-w-[420px] max-h-[92dvh] overflow-y-auto rounded-2xl bg-surface border border-border shadow-lg p-6 relative">
            <button onClick={close} aria-label="Đóng" className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-3 hover:text-ink hover:bg-bg-soft text-2xl leading-none cursor-pointer">×</button>

            {paid ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-xl font-extrabold">Cảm ơn bạn rất nhiều!</h3>
                <p className="text-ink-2 text-sm mt-2">Sự ủng hộ <b className="text-accent">{formatVND(qr!.amount)}</b> của bạn giúp duy trì &amp; phát triển cộng đồng VIE AI EDU. ❤️</p>
                <button onClick={close} className="mt-5 rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-2.5 cursor-pointer transition-colors">Đóng</button>
              </div>
            ) : qr ? (
              <div className="text-center">
                <h3 className="text-lg font-extrabold">Quét QR để ủng hộ</h3>
                <p className="text-ink-2 text-sm mt-1 mb-3">Chuyển khoản đúng nội dung. Hệ thống tự xác nhận sau vài giây.</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.qrUrl} alt="QR ủng hộ" className="w-56 h-56 mx-auto rounded-lg border border-border" />
                <div className="mt-3 text-sm space-y-1">
                  <div>Số tiền: <b className="text-accent">{formatVND(qr.amount)}</b></div>
                  <div>Nội dung: <b className="font-mono">{qr.code}</b></div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 text-ink-3 text-sm"><span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Đang chờ chuyển khoản…</div>
                <button onClick={reset} className="mt-3 text-ink-3 text-sm hover:text-ink cursor-pointer">← Đổi số tiền</button>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-3xl">❤️</div>
                  <h3 className="text-xl font-extrabold mt-1">Ủng hộ cộng đồng</h3>
                  <p className="text-ink-2 text-sm mt-2">Đây là khoản <b>ủng hộ tự nguyện</b> để duy trì &amp; phát triển cộng đồng VIE AI EDU. Hoàn toàn <b>tùy tâm, không bắt buộc</b> — mọi đóng góp đều trân quý.</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  {PRESETS.map((p) => (
                    <button key={p} onClick={() => { setAmount(p); setCustom(""); }} className={`rounded-lg border py-2 text-sm font-semibold cursor-pointer transition-colors ${!custom && amount === p ? "border-accent bg-accent-weak text-accent" : "border-border-strong hover:border-accent"}`}>
                      {p >= 1000 ? `${p / 1000}K` : p}
                    </button>
                  ))}
                  <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Khác…" className="rounded-lg border border-border-strong px-2 text-sm outline-none focus:border-accent text-center" />
                </div>

                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Lời nhắn (không bắt buộc)…" rows={2} className="w-full mt-3 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent resize-none" />

                <button onClick={createDonation} disabled={busy || value < 10000} className="w-full mt-4 rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold py-3 cursor-pointer transition-colors">
                  {busy ? "Đang tạo mã…" : `Ủng hộ ${formatVND(value)}`}
                </button>
                <p className="text-center text-ink-3 text-xs mt-2">Thanh toán qua chuyển khoản QR (SePay) · không lưu thông tin thẻ</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
