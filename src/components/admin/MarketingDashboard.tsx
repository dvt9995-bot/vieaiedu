"use client";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";

interface Data {
  days: number; visits: number; uniques: number; active7: number; signups: number;
  enrollments: number; paid: number; revenue: number; total_users: number;
  sessions: number; bounce_rate: number; pages_per_session: number; avg_dwell_sec: number; avg_session_sec: number;
  by_day: { d: string; visits: number; signups: number }[];
  top_pages: { path: string; n: number }[];
  sources: { ref: string; n: number }[];
  top_events: { event: string; n: number }[];
  top_clicks: { label: string; n: number }[];
  top_courses: { slug: string; n: number }[];
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmtSec = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);

// Mặc định MỌI field → component không bao giờ crash kể cả khi API trả thiếu
const DEFAULTS: Data = {
  days: 30, visits: 0, uniques: 0, active7: 0, signups: 0, enrollments: 0, paid: 0, revenue: 0, total_users: 0,
  sessions: 0, bounce_rate: 0, pages_per_session: 0, avg_dwell_sec: 0, avg_session_sec: 0,
  by_day: [], top_pages: [], sources: [], top_events: [], top_clicks: [], top_courses: [],
};

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
  const [err, setErr] = useState("");
  const [online, setOnline] = useState<{ online: number; online_users: number; today_visits: number } | null>(null);

  useEffect(() => {
    setLoading(true); setErr("");
    fetch(`/api/admin/marketing?days=${days}`).then((r) => r.json())
      .then((x) => { if (x?.error) setErr(x.error); else if (x?.visits != null) setD({ ...DEFAULTS, ...x }); else setErr("Phản hồi không hợp lệ"); setLoading(false); })
      .catch((e) => { setErr(e?.message || "Không kết nối được"); setLoading(false); });
  }, [days]);

  // Trực tuyến thời gian thực — poll mỗi 15 giây
  useEffect(() => {
    let stop = false;
    const tick = () => fetch("/api/admin/online").then((r) => r.json()).then((x) => { if (!stop && x) setOnline(x); }).catch(() => {});
    tick();
    const t = setInterval(tick, 15000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  if (loading) return <p className="text-ink-3">Đang tải dữ liệu marketing…</p>;
  if (err) return <div className="rounded-card border border-accent/30 bg-accent-weak p-4 text-accent text-sm">Lỗi tải dữ liệu marketing: {err}</div>;
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

      {/* ĐANG TRỰC TUYẾN — thời gian thực */}
      <div className="rounded-card border border-success/30 bg-success/5 p-4 mb-5 flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          <span className="text-2xl font-extrabold text-success tabular-nums">{online?.online ?? "—"}</span>
          <span className="text-ink-2 text-sm">đang trực tuyến</span>
        </div>
        <div className="text-sm text-ink-3 flex gap-5">
          <span>👤 <b className="text-ink">{online?.online_users ?? 0}</b> đã đăng nhập</span>
          <span>📅 <b className="text-ink">{(online?.today_visits ?? 0).toLocaleString("vi-VN")}</b> lượt xem hôm nay</span>
        </div>
        <span className="text-ink-3 text-[11px] ml-auto">cập nhật mỗi 15s · tính khách hoạt động ≤5 phút</span>
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

      {/* Engagement — thời gian, tỉ lệ ở lại/thoát, tương tác */}
      <div className="rounded-card border border-border bg-surface p-5 mb-5">
        <h3 className="font-bold text-sm mb-3">Mức độ gắn kết (Engagement)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {([
            ["Phiên truy cập", d.sessions.toLocaleString("vi-VN"), "lần ghé"],
            ["TG / phiên", fmtSec(d.avg_session_sec), "trung bình"],
            ["TG / trang", fmtSec(d.avg_dwell_sec), "ở lại đọc"],
            ["Tỉ lệ thoát", `${d.bounce_rate}%`, d.bounce_rate <= 40 ? "tốt 👍" : d.bounce_rate <= 60 ? "ổn" : "cao ⚠️"],
            ["Trang / phiên", String(d.pages_per_session), "độ sâu"],
          ] as [string, string, string][]).map(([l, v, sub]) => (
            <div key={l} className="rounded-lg border border-border bg-bg-soft p-3">
              <div className="text-ink-3 text-[11px]">{l}</div>
              <div className="text-lg font-extrabold tracking-tight">{v}</div>
              <div className="text-ink-3 text-[10px]">{sub}</div>
            </div>
          ))}
        </div>
        <p className="text-ink-3 text-[11px] mt-2">Tỉ lệ thoát = % phiên chỉ xem 1 trang rồi rời đi. TG/phiên = tổng thời gian ở lại web mỗi lần ghé.</p>
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
        <ListBox title={`🖱️ Nút bấm nhiều (CTR / ${d.visits} lượt xem)`} rows={d.top_clicks.map((e) => ({ label: `${e.label}  ·  ${pct(e.n, d.visits)}%`, n: e.n }))} />
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
