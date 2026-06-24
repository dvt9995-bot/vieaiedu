"use client";
import { useEffect, useState, useCallback } from "react";
import { formatVND, formatDate } from "@/lib/format";
import { toast } from "@/components/Toaster";

interface O {
  id: string; course_slug: string; amount: number; wallet_used: number; coupon_code: string | null;
  status: string; sepay_ref: string | null; paid_at: string | null; created_at: string; name: string; student_code: string;
}

const STATUS: Record<string, [string, string]> = {
  paid: ["Đã thanh toán", "bg-success/10 text-success"],
  pending: ["Chờ thanh toán", "bg-gold/15 text-warning"],
  expired: ["Hết hạn", "bg-bg-soft text-ink-3"],
};

export default function OrderManager() {
  const [list, setList] = useState<O[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/orders?status=${filter}`).then((x) => x.json()).catch(() => ({ items: [] }));
    setList(r.items || []); setLoading(false);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "enroll" | "mark_paid", label: string) {
    if (!confirm(`${label} cho đơn này?`)) return;
    const r = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) }).then((x) => x.json()).catch(() => ({}));
    if (r.ok) { toast("Đã xử lý ✓"); load(); } else toast(r.error || "Thất bại", "error");
  }

  const revenue = list.filter((o) => o.status === "paid").reduce((s, o) => s + (o.amount || 0) + (o.wallet_used || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">Đơn hàng {list.length > 0 && <span className="text-ink-3 font-normal">({list.length})</span>}</h2>
        <div className="flex gap-1.5">
          {[["all", "Tất cả"], ["paid", "Đã TT"], ["pending", "Chờ TT"], ["expired", "Hết hạn"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer border ${filter === v ? "border-accent bg-accent-weak text-accent" : "border-border-strong hover:border-accent"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4 mb-4 flex gap-6 text-sm flex-wrap">
        <div><span className="text-ink-3">Doanh thu (đã TT):</span> <b className="text-accent">{formatVND(revenue)}</b></div>
        <div><span className="text-ink-3">Số đơn:</span> <b>{list.length}</b></div>
      </div>

      <div className="rounded-card border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="text-ink-3 text-xs border-b border-border">
            <tr><th className="text-left px-4 py-3 font-semibold">Học viên</th><th className="text-left px-4 py-3 font-semibold">Khóa</th><th className="text-right px-4 py-3 font-semibold">Số tiền</th><th className="text-left px-4 py-3 font-semibold">Trạng thái</th><th className="text-left px-4 py-3 font-semibold">Ngày</th><th className="text-right px-4 py-3 font-semibold">Thao tác</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-3">Đang tải…</td></tr>
            : list.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-3">Chưa có đơn hàng</td></tr>
            : list.map((o) => {
              const [lbl, cls] = STATUS[o.status] || [o.status, "bg-bg-soft text-ink-3"];
              return (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3"><div className="font-medium">{o.name}</div><div className="text-ink-3 text-xs font-mono">{o.student_code}</div></td>
                  <td className="px-4 py-3 text-ink-2">{o.course_slug}{o.coupon_code && <span className="ml-1 text-xs text-accent">·{o.coupon_code}</span>}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap"><b>{formatVND((o.amount || 0) + (o.wallet_used || 0))}</b>{o.wallet_used > 0 && <div className="text-ink-3 text-[11px]">ví {formatVND(o.wallet_used)}</div>}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>{lbl}</span></td>
                  <td className="px-4 py-3 text-ink-3 text-xs whitespace-nowrap">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {o.status === "paid"
                      ? <button onClick={() => act(o.id, "enroll", "Ghi danh lại")} className="text-accent text-xs font-semibold hover:underline cursor-pointer">Ghi danh lại</button>
                      : <button onClick={() => act(o.id, "mark_paid", "Xác nhận đã nhận tiền + ghi danh")} className="text-success text-xs font-semibold hover:underline cursor-pointer">✓ Xác nhận TT</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-ink-3 text-xs mt-3">💡 “✓ Xác nhận TT”: xác nhận đã nhận tiền thủ công (nếu webhook chưa tự khớp) → đánh dấu đã thanh toán + ghi danh. “Ghi danh lại”: dùng khi đã thu tiền nhưng học viên chưa vào được khóa.</p>
    </div>
  );
}
