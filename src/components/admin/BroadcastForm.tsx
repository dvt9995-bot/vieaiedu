"use client";
import { useState } from "react";

export default function BroadcastForm() {
  const [f, setF] = useState({ title: "", body: "", href: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!f.title.trim()) { setMsg("Cần nhập tiêu đề"); return; }
    if (!confirm("Gửi thông báo này tới TẤT CẢ học viên?")) return;
    setBusy(true); setMsg("Đang gửi…");
    const r = await fetch("/api/admin/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).then((x) => x.json());
    setBusy(false);
    setMsg(r.ok ? `Đã gửi tới ${r.sent} học viên.` : r.error || "Lỗi");
    if (r.ok) setF({ title: "", body: "", href: "" });
  }

  const inp = "w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  return (
    <div className="max-w-[520px]">
      <h2 className="font-bold text-lg mb-1">Gửi thông báo hàng loạt</h2>
      <p className="text-ink-2 text-sm mb-4">Thông báo sẽ hiện trong app + đẩy (push) tới mọi học viên.</p>
      <div className="space-y-3">
        <input className={inp} placeholder="Tiêu đề" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className={`${inp} min-h-[90px]`} placeholder="Nội dung" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <input className={inp} placeholder="Link khi bấm vào (tùy chọn, vd /courses)" value={f.href} onChange={(e) => setF({ ...f, href: e.target.value })} />
        <button onClick={send} disabled={busy} className="rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 cursor-pointer transition-colors">Gửi tới tất cả</button>
        {msg && <p className="text-sm text-ink-2">{msg}</p>}
      </div>
    </div>
  );
}
