"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toaster";

interface W { id: string; amount: number; bank_name: string; bank_account: string; bank_holder: string; status: string; created_at: string; name: string }
const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "đ";
const BADGE: Record<string, string> = { pending: "bg-gold/20 text-gold", approved: "bg-success/15 text-success", rejected: "bg-accent/15 text-accent" };
const LABEL: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };

export default function WithdrawManager() {
  const [items, setItems] = useState<W[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); const r = await fetch("/api/admin/withdrawals").then((x) => x.json()).catch(() => ({ items: [] })); setItems(r.items || []); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function act(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("Từ chối & hoàn tiền vào ví học viên?")) return;
    if (action === "approve" && !confirm("Xác nhận ĐÃ chuyển khoản và duyệt yêu cầu này?")) return;
    await fetch("/api/admin/withdrawals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    toast(action === "approve" ? "Đã duyệt" : "Đã từ chối & hoàn tiền");
    load();
  }

  const pending = items.filter((w) => w.status === "pending").length;
  return (
    <div>
      <h2 className="font-bold text-lg mb-4">Yêu cầu rút tiền {pending > 0 && <span className="text-accent font-normal">({pending} chờ duyệt)</span>}</h2>
      <div className="space-y-3">
        {loading ? <p className="text-ink-3">Đang tải…</p>
        : items.length === 0 ? <p className="text-ink-3">Chưa có yêu cầu rút tiền.</p>
        : items.map((w) => (
          <div key={w.id} className="rounded-card border border-border bg-surface p-4 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold">{w.name} · <span className="text-accent">{vnd(w.amount)}</span></div>
              <div className="text-ink-2 text-sm">{w.bank_holder} · {w.bank_name} · <span className="font-mono">{w.bank_account}</span></div>
              <div className="text-ink-3 text-xs">{new Date(w.created_at).toLocaleString("vi-VN")}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${BADGE[w.status]}`}>{LABEL[w.status]}</span>
            {w.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => act(w.id, "approve")} className="rounded-full bg-success hover:opacity-90 text-white font-semibold text-sm px-4 py-2 cursor-pointer">Duyệt (đã CK)</button>
                <button onClick={() => act(w.id, "reject")} className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold text-sm px-4 py-2 cursor-pointer">Từ chối</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
