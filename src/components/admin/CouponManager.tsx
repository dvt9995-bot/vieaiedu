"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toaster";

interface C { code: string; percent_off: number; active: boolean; expires_at: string | null; }

export default function CouponManager() {
  const [list, setList] = useState<C[]>([]);
  const [f, setF] = useState({ code: "", percent_off: "20", expires_at: "" });

  async function load() { const r = await fetch("/api/admin/coupons").then((x) => x.json()); setList(r.coupons || []); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.code.trim()) return toast("Nhập mã giảm giá", "error");
    const r = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: f.code, percent_off: Number(f.percent_off), expires_at: f.expires_at || null }) }).then((x) => x.json());
    if (r.ok) { toast(`Đã tạo mã ${f.code}`); setF({ code: "", percent_off: "20", expires_at: "" }); load(); }
    else toast(r.error || "Tạo mã thất bại", "error");
  }
  async function del(code: string) { if (confirm("Xóa mã " + code + "?")) { await fetch(`/api/admin/coupons?code=${code}`, { method: "DELETE" }); toast(`Đã xóa mã ${code}`); load(); } }

  const inp = "px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  return (
    <div className="max-w-[520px]">
      <h2 className="font-bold text-lg mb-4">Mã giảm giá</h2>
      <div className="flex gap-2 flex-wrap mb-4">
        <input className={`${inp} uppercase w-28`} placeholder="MÃ" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
        <input className={`${inp} w-20`} type="number" placeholder="% giảm" value={f.percent_off} onChange={(e) => setF({ ...f, percent_off: e.target.value })} />
        <input className={inp} type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} />
        <button onClick={add} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-4 cursor-pointer">Thêm</button>
      </div>
      <div className="rounded-card border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {list.length === 0 ? <tr><td className="px-4 py-6 text-center text-ink-3">Chưa có mã nào</td></tr>
            : list.map((c) => (
              <tr key={c.code} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3 text-accent font-semibold">-{c.percent_off}%</td>
                <td className="px-4 py-3 text-ink-3 text-xs">{c.expires_at ? `HSD ${new Date(c.expires_at).toLocaleDateString("vi-VN")}` : "Không hết hạn"}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => del(c.code)} className="text-ink-3 hover:text-accent text-sm cursor-pointer">Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
