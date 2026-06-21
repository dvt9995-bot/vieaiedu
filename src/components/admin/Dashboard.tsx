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

interface Service { key: string; label: string; ok: boolean; note: string }
interface ActionItem { key: string; label: string; count: number; urgent: boolean }

const TAB_OF: Record<string, string> = { withdrawals: "withdraw", posts: "community", users: "users" };

export default function Dashboard({ onGo }: { onGo?: (tab: string) => void }) {
  const [s, setS] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Service[] | null>(null);
  const [actions, setActions] = useState<ActionItem[] | null>(null);
  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setS).catch(() => setS(null));
    fetch("/api/admin/health").then((r) => r.json()).then((d) => setHealth(d.services || [])).catch(() => setHealth([]));
    fetch("/api/admin/action-items").then((r) => r.json()).then((d) => setActions(d.items || [])).catch(() => setActions([]));
  }, []);
  const o = s?.overview || {};
  const kpis: [string, string][] = [
    ["Doanh thu tháng", formatVND(o.revenue_month || 0)],
    ["Tổng doanh thu", formatVND(o.revenue || 0)],
    ["Trong đó: Ủng hộ", formatVND(o.donations || 0)],
    ["Học viên", String(o.students || 0)],
    ["Đơn đã thanh toán", String(o.orders_paid || 0)],
    ["Lượt ghi danh", String(o.enrollments || 0)],
    ["Tỉ lệ hoàn thành", `${o.completion_rate || 0}%`],
  ];
  return (
    <div className="space-y-6">
      {/* Cần xử lý */}
      {actions && actions.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="text-sm font-semibold mb-3">🛎 Cần xử lý</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {actions.map((a) => {
              const tab = TAB_OF[a.key];
              const active = a.count > 0;
              const Inner = (
                <>
                  <div className={`text-2xl font-extrabold tracking-tight ${a.urgent ? "text-accent" : active ? "text-ink" : "text-ink-3"}`}>{a.count}</div>
                  <div className="text-ink-3 text-xs leading-snug mt-0.5">{a.label}</div>
                </>
              );
              return tab ? (
                <button key={a.key} onClick={() => onGo?.(tab)} className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${a.urgent ? "border-accent/40 bg-accent-weak hover:border-accent" : "border-border hover:border-border-strong"}`}>{Inner}</button>
              ) : (
                <div key={a.key} className={`rounded-lg border p-3 ${a.urgent ? "border-accent/40 bg-accent-weak" : "border-border"}`}>{Inner}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sức khỏe hệ thống */}
      {health && (
        <div className="rounded-card border border-border bg-surface p-5">
          <div className="text-sm font-semibold mb-3">Sức khỏe hệ thống</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {health.map((sv) => (
              <div key={sv.key} className="flex items-start gap-2.5">
                <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${sv.ok ? "bg-success" : "bg-accent"}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{sv.label}</div>
                  <div className={`text-xs ${sv.ok ? "text-ink-3" : "text-accent"}`}>{sv.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
