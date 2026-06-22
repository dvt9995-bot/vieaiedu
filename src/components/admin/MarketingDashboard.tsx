"use client";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";

interface Data {
  days: number; visits: number; uniques: number; active7: number; signups: number;
  enrollments: number; paid: number; revenue: number; total_users: number;
  by_day: { d: string; visits: number; signups: number }[];
  top_pages: { path: string; n: number }[];
  sources: { ref: string; n: number }[];
  top_events: { event: string; n: number }[];
  top_courses: { slug: string; n: number }[];
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function Bars({ data }: { data: { d: string; visits: number; signups: number }[] }) {
  const max = Math.max(...data.map((p) => p.visits), 1);
  return (
    <div className="flex items-end gap-[3px] h-32">
      {data.map((p, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end group relative" title={`${p.d}: ${p.visits} lượt · ${p.signups} đăng ký`}>
          <div className="w-full bg-accent/80 rounded-t-sm transition-all hover:bg-accent" style={{ height: `${(p.visits / max) * 100}%`, minHeight: p.visits ? 3 : 0 }} />
        </div>
      ))}
    </div>
  );
}

function ListBox({ title, rows, fmt }: { title: string; rows: { label: string; n: number }[]; fmt?: (s: string) => string }) {
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      {rows.length === 0 ? <p className="text-ink-3 text-sm">Chưa có dữ liệu</p> : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-0.5"><span className="text-ink-2 truncate pr-2">{fmt ? fmt(r.label) : r.label}</span><b className="text-ink shrink-0">{r.n.toLocaleString("vi-VN")}</b></div>
              <div className="h-1.5 bg-bg-soft rounded-full overflow-hidden"><div className="h-full bg-accent/70 rounded-full" style={{ width: `${(r.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarketingDashboard() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/marketing?days=${days}`).then((r) => r.json()).then((x) => { setD(x?.visits != null ? x : null); setLoading(false); }).catch(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-ink-3">Đang tải dữ liệu marketing…</p>;
  if (!d) return <p className="text-ink-3">Chưa có dữ liệu.</p>;

  const kpis: [string, string, string][] = [
    ["Lượt truy cập", d.visits.toLocaleString("vi-VN"), "pageview"],
    ["Khách duy nhất", d.uniques.toLocaleString("vi-VN"), "unique"],
    ["Đăng ký mới", d.signups.toLocaleString("vi-VN"), `tổng ${d.total_users} tài khoản`],
    ["Hoạt động 7 ngày", d.active7.toLocaleString("vi-VN"), "có đăng nhập"],
    ["Đơn thanh toán", d.paid.toLocaleString("vi-VN"), "đã trả phí"],
    ["Doanh thu", formatVND(d.revenue), `${days} ngày`],
  ];
  // Phễu AARRR: Truy cập → Đăng ký → Ghi danh → Thanh toán
  const funnel = [
    { label: "👀 Truy cập (khách duy nhất)", n: d.uniques, base: d.uniques },
    { label: "📝 Đăng ký", n: d.signups, base: d.uniques },
    { label: "🎓 Ghi danh khóa", n: d.enrollments, base: d.signups },
    { label: "💳 Thanh toán", n: d.paid, base: d.enrollments },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">📈 Marketing & Hành vi khách hàng</h2>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((v) => (
            <button key={v} onClick={() => setDays(v)} className={`text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer border ${days === v ? "border-accent bg-accent-weak text-accent" : "border-border-strong hover:border-accent"}`}>{v} ngày</button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {kpis.map(([l, v, sub]) => (
          <div key={l} className="rounded-card border border-border bg-surface p-4">
            <div className="text-ink-3 text-xs">{l}</div>
            <div className="text-xl font-extrabold tracking-tight mt-0.5">{v}</div>
            <div className="text-ink-3 text-[11px] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Phễu chuyển đổi */}
      <div className="rounded-card border border-border bg-surface p-5 mb-5">
        <h3 className="font-bold text-sm mb-1">Phễu chuyển đổi (AARRR)</h3>
        <p className="text-ink-3 text-xs mb-4">Tỷ lệ chuyển đổi giữa các bước — điểm rơi để tối ưu marketing.</p>
        <div className="space-y-2.5">
          {funnel.map((f, i) => {
            const widthMax = funnel[0].n || 1;
            const conv = i === 0 ? 100 : pct(f.n, f.base);
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1"><span className="text-ink-2">{f.label}</span><span><b>{f.n.toLocaleString("vi-VN")}</b> {i > 0 && <span className={`text-xs ml-1 ${conv >= 30 ? "text-success" : conv >= 10 ? "text-gold" : "text-accent"}`}>({conv}%)</span>}</span></div>
                <div className="h-3 bg-bg-soft rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-accent to-accent-700 rounded-full" style={{ width: `${Math.max(3, (f.n / widthMax) * 100)}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Biểu đồ truy cập theo ngày */}
      <div className="rounded-card border border-border bg-surface p-5 mb-5">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-sm">Lượt truy cập theo ngày</h3><span className="text-ink-3 text-xs">cao nhất {Math.max(...d.by_day.map((x) => x.visits), 0)}</span></div>
        <Bars data={d.by_day} />
      </div>

      {/* Lưới phân tích hành vi */}
      <div className="grid md:grid-cols-2 gap-4">
        <ListBox title="🔗 Nguồn truy cập" rows={d.sources.map((s) => ({ label: hostOf(s.ref), n: s.n }))} />
        <ListBox title="📄 Trang xem nhiều" rows={d.top_pages.map((p) => ({ label: p.path, n: p.n }))} />
        <ListBox title="🎯 Sự kiện hành vi" rows={d.top_events.map((e) => ({ label: e.event, n: e.n }))} />
        <ListBox title="🔥 Khóa được ghi danh" rows={d.top_courses.map((c) => ({ label: c.slug, n: c.n }))} />
      </div>

      {(d.visits === 0) && <p className="text-ink-3 text-xs mt-4">💡 Lượt truy cập/nguồn/trang sẽ bắt đầu tích lũy ngay khi người dùng truy cập (dữ liệu first-party của riêng app). Phễu đăng ký/ghi danh/thanh toán đã có dữ liệu thật.</p>}
    </div>
  );
}

function hostOf(ref: string) {
  if (!ref || ref.startsWith("(")) return ref || "(trực tiếp)";
  try { return new URL(ref).hostname.replace(/^www\./, ""); } catch { return ref; }
}
