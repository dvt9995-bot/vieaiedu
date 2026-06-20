"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "./Toaster";
import { track } from "@/lib/analytics";
import WalletWithdraw from "./WalletWithdraw";

interface Txn { kind: string; amount: number; reason: string; created_at: string }
interface Data { credit: number; real: number; total: number; referralCount: number; earned: number; userId: string | null; txns: Txn[] }
const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "đ";

export default function WalletDashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  useEffect(() => { fetch("/api/wallet").then((r) => r.json()).then(setD).catch(() => setD(null)); }, []);

  if (!d) return <div className="container-x py-16 text-ink-3">Đang tải ví…</div>;
  const refLink = d.userId ? `https://vieaiedu.vn/?ref=${d.userId}` : "";
  const txns = (d.txns || []).filter((t) => filter === "all" || (filter === "in" ? t.amount > 0 : t.amount < 0));

  return (
    <div className="container-x py-10 max-w-[860px]">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight mb-1">Ví &amp; Kiếm tiền</h1>
      <p className="text-ink-2 mb-7">Theo dõi số dư, kiếm hoa hồng và quản lý giao dịch của bạn.</p>

      {/* Số dư */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-card border border-accent/25 bg-gradient-to-br from-accent-weak to-transparent p-5">
          <div className="text-ink-3 text-sm">Số dư khuyến mãi</div>
          <div className="text-2xl font-extrabold text-accent mt-1">{vnd(d.credit)}</div>
          <div className="text-ink-3 text-xs mt-1">Chỉ dùng mua khóa học</div>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="text-ink-3 text-sm">Số dư hoa hồng</div>
          <div className="text-2xl font-extrabold text-ink mt-1">{vnd(d.real)}</div>
          <div className="text-ink-3 text-xs mt-1">Mua khóa hoặc rút về NH</div>
        </div>
        <div className="rounded-card border border-border bg-ink text-white p-5">
          <div className="text-white/60 text-sm">Tổng hoa hồng đã kiếm</div>
          <div className="text-2xl font-extrabold mt-1">{vnd(d.earned)}</div>
          <div className="text-white/50 text-xs mt-1">{d.referralCount} người được giới thiệu</div>
        </div>
      </div>

      {/* Kiếm tiền (referral) */}
      <section className="rounded-card border border-border bg-surface p-6 mb-6">
        <h2 className="font-bold text-lg mb-1">🚀 Kiếm tiền cùng VIE AI EDU</h2>
        <p className="text-ink-2 text-sm mb-4">Mời bạn bè qua liên kết của bạn. Khi họ mua khóa học, bạn nhận <b className="text-accent">hoa hồng</b> vào ví — rút được về ngân hàng.</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-4 text-sm">
          {[["1", "Chia sẻ liên kết", "Gửi link cho bạn bè, đăng mạng xã hội"], ["2", "Bạn đăng ký & mua", "Họ tạo tài khoản và mua khóa học"], ["3", "Bạn nhận hoa hồng", "Tiền tự cộng vào ví, rút khi muốn"]].map(([n, t, s]) => (
            <div key={n} className="rounded-card border border-border bg-bg-soft p-3">
              <div className="w-7 h-7 rounded-full bg-accent text-white grid place-items-center font-bold mb-2">{n}</div>
              <div className="font-semibold">{t}</div><div className="text-ink-3 text-xs mt-0.5">{s}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <input readOnly value={refLink} className="flex-1 min-w-[220px] font-mono text-xs px-3 py-2.5 rounded-lg border border-border-strong bg-bg-soft outline-none" />
          <button onClick={() => { navigator.clipboard?.writeText(refLink); track("share", { method: "referral_copy" }); toast("Đã sao chép liên kết mời"); }} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 cursor-pointer transition-colors">Sao chép</button>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`} target="_blank" rel="noopener" onClick={() => track("share", { method: "referral_facebook" })} className="rounded-full bg-[#1877f2] text-white font-semibold text-sm px-5 py-2.5 hover:opacity-90 transition-opacity">Chia sẻ Facebook</a>
        </div>
      </section>

      {/* Rút tiền */}
      <div className="mb-6"><WalletWithdraw /></div>

      {/* Lịch sử giao dịch */}
      <section className="rounded-card border border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-bold text-lg">Lịch sử giao dịch</h2>
          <div className="flex gap-1.5">
            {([["all", "Tất cả"], ["in", "Tiền vào"], ["out", "Tiền ra"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`text-sm rounded-full px-3 py-1 border cursor-pointer transition-colors ${filter === k ? "bg-accent text-white border-accent" : "bg-surface border-border-strong text-ink-2 hover:border-accent"}`}>{l}</button>
            ))}
          </div>
        </div>
        {txns.length === 0 ? (
          <p className="text-ink-3 text-sm">Chưa có giao dịch nào.</p>
        ) : (
          <div className="divide-y divide-border">
            {txns.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{t.reason || (t.amount > 0 ? "Cộng tiền" : "Trừ tiền")}</div>
                  <div className="text-ink-3 text-xs">{new Date(t.created_at).toLocaleString("vi-VN")} · {t.kind === "credit" ? "Khuyến mãi" : "Hoa hồng"}</div>
                </div>
                <div className={`font-bold text-sm tabular-nums ${t.amount > 0 ? "text-success" : "text-accent"}`}>{t.amount > 0 ? "+" : ""}{vnd(t.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-ink-3 text-xs mt-6"><Link href="/account" className="hover:text-accent">← Về cài đặt tài khoản</Link></p>
    </div>
  );
}
