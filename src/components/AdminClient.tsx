"use client";
import { useEffect, useState } from "react";
import { COURSES } from "@/lib/mock";
import { formatVND } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

interface Stats { students: number; revenue: number; orders: { id: string; course_slug: string; amount: number }[]; }

type Tab = "overview" | "courses" | "community" | "revenue";
const NAV: [Tab, string, string][] = [
  ["overview", "Tổng quan", "▦"],
  ["courses", "Khóa học", "▤"],
  ["community", "Cộng đồng", "◫"],
  ["revenue", "Doanh thu", "₫"],
];

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const [{ count: students }, paid] = await Promise.all([
        supabase.from("enrollments").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("id, course_slug, amount").eq("status", "paid").order("paid_at", { ascending: false }).limit(10),
      ]);
      const orders = paid.data ?? [];
      setStats({ students: students ?? 0, revenue: orders.reduce((s, o) => s + (o.amount as number), 0), orders });
    })();
  }, []);

  return (
    <div className="container-x py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-semibold">Bảng điều khiển</div>
          <h1 className="text-2xl font-extrabold tracking-tight">Quản trị VIE AI EDU</h1>
        </div>
        <span className="text-xs text-success font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Không cần code</span>
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-6 items-start">
        {/* Sidebar */}
        <nav className="rounded-card border border-border bg-surface p-2 md:sticky md:top-24">
          {NAV.map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${tab === t ? "bg-accent-weak text-accent" : "text-ink-2 hover:bg-bg-soft"}`}>
              <span className="w-5 text-center">{icon}</span>{label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {tab === "overview" && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  ["Doanh thu", stats ? formatVND(stats.revenue) : "128tr", stats ? "thật" : "+12%"],
                  ["Học viên", stats ? String(stats.students) : "8.420", stats ? "thật" : "+340"],
                  ["Khóa học", String(COURSES.length), ""],
                  ["Tỉ lệ hoàn thành", "63%", "+4%"],
                ].map(([l, v, d]) => (
                  <div key={l} className="rounded-card border border-border bg-surface p-5">
                    <div className="text-ink-3 text-xs">{l}</div>
                    <div className="text-2xl font-extrabold tracking-tight mt-1">{v}</div>
                    {d && <div className="text-success text-xs font-semibold mt-0.5">{d}</div>}
                  </div>
                ))}
              </div>
              <div className="rounded-card border border-border bg-surface p-5">
                <div className="text-sm font-semibold mb-3">Lượt đăng ký 7 ngày qua</div>
                <div className="flex items-end gap-2 h-32">
                  {[42, 64, 50, 78, 60, 94, 72].map((h, i) => (
                    <div key={i} className="flex-1 bg-accent/85 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "courses" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Quản lý khóa học</h2>
                <button onClick={() => setShowForm(!showForm)} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-4 py-2 cursor-pointer transition-colors">+ Thêm khóa học</button>
              </div>
              {showForm && (
                <div className="rounded-card border border-border bg-bg-soft p-5 mb-4 grid sm:grid-cols-2 gap-3">
                  <input className="auth-input bg-surface" placeholder="Tên khóa học" />
                  <input className="auth-input bg-surface" placeholder="Giá (VND)" />
                  <input className="auth-input bg-surface sm:col-span-2" placeholder="Mô tả ngắn" />
                  <div className="sm:col-span-2 flex gap-2">
                    <button className="rounded-full bg-ink text-white font-semibold text-sm px-4 py-2 cursor-pointer">Lưu khóa học</button>
                    <button onClick={() => setShowForm(false)} className="rounded-full border border-border-strong text-sm px-4 py-2 cursor-pointer">Hủy</button>
                  </div>
                </div>
              )}
              <div className="rounded-card border border-border bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-bg-soft text-ink-3 text-left text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">Khóa học</th><th className="px-4 py-3 font-semibold">Giá</th><th className="px-4 py-3 font-semibold hidden sm:table-cell">Học viên</th><th className="px-4 py-3 font-semibold"></th>
                  </tr></thead>
                  <tbody>
                    {COURSES.map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{c.title}</td>
                        <td className="px-4 py-3">{formatVND(c.price)}</td>
                        <td className="px-4 py-3 hidden sm:table-cell text-ink-2">{c.students.toLocaleString("vi-VN")}</td>
                        <td className="px-4 py-3 text-right"><button className="text-accent font-semibold cursor-pointer hover:underline">Sửa</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "community" && (
            <div className="rounded-card border border-border bg-surface p-5">
              <h2 className="font-bold text-lg mb-4">Duyệt bài cộng đồng</h2>
              {["Bài chia sẻ pipeline RAG — Thu Hà", "Câu hỏi về lộ trình — Quốc Bảo"].map((t) => (
                <div key={t} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <span className="text-ink-2 text-sm">{t}</span>
                  <div className="flex gap-2">
                    <button className="text-success text-sm font-semibold cursor-pointer">Duyệt</button>
                    <button className="text-accent text-sm font-semibold cursor-pointer">Ẩn</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "revenue" && (
            <div className="rounded-card border border-border bg-surface p-5">
              <h2 className="font-bold text-lg mb-4">Giao dịch SePay gần đây</h2>
              <table className="w-full text-sm">
                <thead><tr className="text-ink-3 text-left text-xs uppercase"><th className="py-2">Mã</th><th className="py-2">Khóa</th><th className="py-2 text-right">Số tiền</th></tr></thead>
                <tbody>
                  {(stats?.orders.length
                    ? stats.orders.map((o) => [o.id.slice(0, 8).toUpperCase(), o.course_slug, o.amount] as [string, string, number])
                    : [["SP10293", "Prompt Engineering", 699000], ["SP10292", "Xây Chatbot AI", 1199000], ["SP10291", "AI tạo ảnh & video", 599000]] as [string, string, number][]
                  ).map((r) => (
                    <tr key={r[0]} className="border-t border-border"><td className="py-2.5 font-mono text-ink-2">{r[0]}</td><td className="py-2.5">{r[1]}</td><td className="py-2.5 text-right font-semibold">{formatVND(r[2])}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
