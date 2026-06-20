"use client";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";

interface Pt { d: string; total: number; }
interface Stats { overview: Record<string, number>; revenue: Pt[]; signups: Pt[]; top: { course_slug: string; students: number }[]; }

function BarChart({ data, color, fmt }: { data: Pt[]; color: string; fmt?: (n: number) => string }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-ink-3 text-sm">Chưa có dữ liệu</div>;
  const max = Math.max(...data.map((p) => p.total), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((p, i) => (
        <div key={i} className="flex-1 group relative" title={`${p.d}: ${fmt ? fmt(p.total) : p.total}`}>
          <div className="rounded-t" style={{ height: `${(p.total / max) * 100}%`, minHeight: 2, background: color }} />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/admin/stats").then((r) => r.json()).then(setS).catch(() => setS(null)); }, []);
  const o = s?.overview || {};
  const kpis: [string, string][] = [
    ["Doanh thu tháng", formatVND(o.revenue_month || 0)],
    ["Tổng doanh thu", formatVND(o.revenue || 0)],
    ["Học viên", String(o.students || 0)],
    ["Đơn đã thanh toán", String(o.orders_paid || 0)],
    ["Lượt ghi danh", String(o.enrollments || 0)],
    ["Tỉ lệ hoàn thành", `${o.completion_rate || 0}%`],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-card border border-border bg-surface p-5">
            <div className="text-2xl font-extrabold tracking-tight">{v}</div>
            <div className="text-ink-3 text-sm">{l}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="text-sm font-semibold mb-3">Doanh thu 30 ngày</div>
          <BarChart data={s?.revenue || []} color="#e41e26" fmt={formatVND} />
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="text-sm font-semibold mb-3">Học viên mới 30 ngày</div>
          <BarChart data={s?.signups || []} color="#15803d" />
        </div>
      </div>
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="text-sm font-semibold mb-3">Top khóa học (ghi danh)</div>
        {(s?.top || []).length === 0 ? <p className="text-ink-3 text-sm">Chưa có dữ liệu</p> : (
          <ul className="space-y-2">
            {s!.top.map((t, i) => (
              <li key={t.course_slug} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-ink-3">{i + 1}</span>
                <span className="flex-1">{t.course_slug}</span>
                <b>{t.students}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
