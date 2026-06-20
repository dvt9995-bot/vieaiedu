"use client";
import { useState } from "react";
import Dashboard from "@/components/admin/Dashboard";
import CourseManager from "@/components/admin/CourseManager";
import UserManager from "@/components/admin/UserManager";
import CouponManager from "@/components/admin/CouponManager";
import SettingsManager from "@/components/admin/SettingsManager";
import BroadcastForm from "@/components/admin/BroadcastForm";

type Tab = "overview" | "courses" | "users" | "coupons" | "community" | "broadcast" | "settings";
const NAV: [Tab, string, string][] = [
  ["overview", "Tổng quan", "▦"],
  ["courses", "Khóa học", "▤"],
  ["users", "Học viên", "◍"],
  ["coupons", "Mã giảm giá", "%"],
  ["community", "Cộng đồng", "◫"],
  ["broadcast", "Thông báo", "🔔"],
  ["settings", "Cài đặt", "⚙"],
];

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("overview");

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
        <nav className="rounded-card border border-border bg-surface p-2 md:sticky md:top-24 flex md:block overflow-x-auto">
          {NAV.map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors whitespace-nowrap ${tab === t ? "bg-accent-weak text-accent" : "text-ink-2 hover:bg-bg-soft"}`}>
              <span className="w-5 text-center">{icon}</span>{label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "overview" && <Dashboard />}
          {tab === "courses" && <CourseManager />}
          {tab === "users" && <UserManager />}
          {tab === "coupons" && <CouponManager />}
          {tab === "broadcast" && <BroadcastForm />}
          {tab === "settings" && <SettingsManager />}
          {tab === "community" && (
            <div className="rounded-card border border-border bg-surface p-5">
              <h2 className="font-bold text-lg mb-4">Duyệt bài cộng đồng</h2>
              <p className="text-ink-2 text-sm">Bài cộng đồng hiển thị tại trang /community. Quản trị viên có thể ẩn/xóa bài vi phạm trực tiếp (đang dùng dữ liệu thật từ DB nếu đã đăng).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
