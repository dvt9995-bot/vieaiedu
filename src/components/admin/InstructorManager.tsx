"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/Toaster";
import { formatVND } from "@/lib/format";

interface Profile { full_name?: string; email?: string; avatar_url?: string }
interface Appl { id: string; full_name?: string; expertise?: string; bio?: string; sample_links?: string; motivation?: string; status: string; created_at: string; profile?: Profile | null }
interface PCourse { id: string; slug: string; title: string; price: number; total_minutes: number; owner?: Profile | null }

export default function InstructorManager() {
  const [apps, setApps] = useState<Appl[]>([]);
  const [courses, setCourses] = useState<PCourse[]>([]);

  const [gcal, setGcal] = useState<{ connected: boolean; hasClient: boolean } | null>(null);
  const load = useCallback(async () => {
    const [a, c, g] = await Promise.all([
      fetch("/api/admin/instructors").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/course-review").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/gcal").then((r) => r.json()).catch(() => ({})),
    ]);
    setApps(a.applications || []); setCourses(c.courses || []); setGcal(g.connected !== undefined ? g : null);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function actApp(id: string, action: "approve" | "reject") {
    const note = action === "reject" ? prompt("Lý do từ chối (gửi cho người đăng ký):") || "" : "";
    if (action === "reject" && note === null) return;
    await fetch("/api/admin/instructors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, note }) });
    toast(action === "approve" ? "Đã duyệt giảng viên" : "Đã từ chối"); load();
  }
  async function actCourse(id: string, action: "approve" | "reject") {
    const note = action === "reject" ? prompt("Góp ý chỉnh sửa (gửi cho giảng viên):") || "" : "";
    if (action === "reject" && note === null) return;
    await fetch("/api/admin/course-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, note }) });
    toast(action === "approve" ? "Đã duyệt & công khai khóa học" : "Đã trả về chỉnh sửa"); load();
  }

  const pendingApps = apps.filter((a) => a.status === "pending");
  return (
    <div className="space-y-6">
      {/* Kết nối Google Meet (tự sinh link cho lớp LIVE) */}
      {gcal && (
        <div className="rounded-card border border-border bg-surface p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">🎥 Google Meet (lớp trực tiếp)</div>
            <div className={`text-xs mt-0.5 ${gcal.connected ? "text-success" : "text-ink-3"}`}>{gcal.connected ? "✓ Đã kết nối — link Meet tự sinh khi giảng viên tạo buổi học." : gcal.hasClient ? "Chưa kết nối. Bấm để cấp quyền tài khoản Google host." : "Chưa cấu hình Client ID/Secret. Cung cấp cho kỹ thuật để bật."}</div>
          </div>
          {gcal.hasClient && <a href="/api/admin/gcal/auth" className="rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold px-5 py-2.5">{gcal.connected ? "Kết nối lại" : "Kết nối Google"}</a>}
        </div>
      )}
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="text-sm font-semibold mb-3">📝 Đơn đăng ký giảng viên {pendingApps.length > 0 && <span className="text-accent">({pendingApps.length} chờ duyệt)</span>}</div>
        {apps.length === 0 ? <p className="text-ink-3 text-sm">Chưa có đơn nào.</p> : (
          <div className="space-y-3">
            {apps.map((a) => (
              <div key={a.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold">{a.full_name || a.profile?.full_name || "—"} <span className="text-xs text-ink-3">· {a.profile?.email}</span></div>
                    <div className="text-sm text-accent font-medium">{a.expertise}</div>
                    {a.bio && <p className="text-sm text-ink-2 mt-1">{a.bio}</p>}
                    {a.sample_links && <p className="text-xs text-ink-3 mt-1 break-all">🔗 {a.sample_links}</p>}
                    {a.motivation && <p className="text-xs text-ink-3 mt-1">💡 {a.motivation}</p>}
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${a.status === "pending" ? "bg-gold/15 text-amber-700" : a.status === "approved" ? "bg-success/15 text-success" : "bg-accent-weak text-accent"}`}>{a.status === "pending" ? "Chờ duyệt" : a.status === "approved" ? "Đã duyệt" : "Từ chối"}</span>
                </div>
                {a.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => actApp(a.id, "approve")} className="rounded-full bg-success text-white text-sm font-semibold px-4 py-1.5 cursor-pointer">Duyệt</button>
                    <button onClick={() => actApp(a.id, "reject")} className="rounded-full border border-border-strong text-sm px-4 py-1.5 cursor-pointer">Từ chối</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-card border border-border bg-surface p-5">
        <div className="text-sm font-semibold mb-3">🎬 Khóa học chờ duyệt {courses.length > 0 && <span className="text-accent">({courses.length})</span>}</div>
        {courses.length === 0 ? <p className="text-ink-3 text-sm">Không có khóa nào chờ duyệt.</p> : (
          <div className="space-y-3">
            {courses.map((c) => (
              <div key={c.id} className="border border-border rounded-lg p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-xs text-ink-3">{c.price > 0 ? formatVND(c.price) : "Miễn phí"} · {Math.round(c.total_minutes || 0)}p · GV: {c.owner?.full_name || c.owner?.email || "—"}</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <a href={`/courses/${c.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-ink-2 hover:text-ink">Xem trước</a>
                  <button onClick={() => actCourse(c.id, "approve")} className="rounded-full bg-success text-white font-semibold px-4 py-1.5 cursor-pointer">Duyệt & công khai</button>
                  <button onClick={() => actCourse(c.id, "reject")} className="font-semibold text-accent cursor-pointer">Trả về sửa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
