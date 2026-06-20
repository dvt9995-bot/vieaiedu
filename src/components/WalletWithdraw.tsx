"use client";
import { useEffect, useState } from "react";
import { toast } from "./Toaster";

interface Req { amount: number; status: string; created_at: string }
const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "đ";
const LABEL: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };

export default function WalletWithdraw() {
  const [real, setReal] = useState(0);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [f, setF] = useState({ amount: "", bank_name: "", bank_account: "", bank_holder: "" });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    const d = await fetch("/api/wallet").then((r) => r.json()).catch(() => null);
    if (d) { setReal(d.real || 0); setReqs(d.withdrawals || []); }
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    setBusy(true);
    const r = await fetch("/api/wallet/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, amount: parseInt(f.amount) || 0 }) }).then((x) => x.json()).catch(() => ({}));
    setBusy(false);
    if (r.ok) { toast("Đã gửi yêu cầu rút tiền"); setF({ amount: "", bank_name: "", bank_account: "", bank_holder: "" }); setOpen(false); load(); }
    else toast(r.error || "Không gửi được", "error");
  }

  const inp = "w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  return (
    <section className="rounded-card border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">Rút tiền hoa hồng</h2>
        <button onClick={() => setOpen((o) => !o)} disabled={real <= 0} className="rounded-full bg-accent hover:bg-accent-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">{open ? "Đóng" : "Tạo yêu cầu"}</button>
      </div>
      <p className="text-ink-2 text-sm mb-3">Có thể rút: <b className="text-ink">{vnd(real)}</b> (chỉ ví hoa hồng).</p>

      {open && (
        <div className="space-y-2.5 mb-4">
          <input className={inp} type="number" placeholder="Số tiền muốn rút (đ)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <input className={inp} placeholder="Ngân hàng (vd: Vietcombank)" value={f.bank_name} onChange={(e) => setF({ ...f, bank_name: e.target.value })} />
          <input className={inp} placeholder="Số tài khoản" value={f.bank_account} onChange={(e) => setF({ ...f, bank_account: e.target.value })} />
          <input className={inp} placeholder="Chủ tài khoản" value={f.bank_holder} onChange={(e) => setF({ ...f, bank_holder: e.target.value })} />
          <button onClick={submit} disabled={busy} className="rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer transition-colors">{busy ? "Đang gửi…" : "Gửi yêu cầu rút"}</button>
        </div>
      )}

      {reqs.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          {reqs.map((w, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>{vnd(w.amount)} <span className="text-ink-3 text-xs">· {new Date(w.created_at).toLocaleDateString("vi-VN")}</span></span>
              <span className={`text-xs font-semibold ${w.status === "approved" ? "text-success" : w.status === "rejected" ? "text-accent" : "text-gold"}`}>{LABEL[w.status]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
