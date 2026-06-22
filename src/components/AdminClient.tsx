"use client";
import { useState } from "react";
import Dashboard from "@/components/admin/Dashboard";
import CourseManager from "@/components/admin/CourseManager";
import UserManager from "@/components/admin/UserManager";
import CouponManager from "@/components/admin/CouponManager";
import SettingsManager from "@/components/admin/SettingsManager";
import BlogManager from "@/components/admin/BlogManager";
import CommunityModerator from "@/components/admin/CommunityModerator";
import WithdrawManager from "@/components/admin/WithdrawManager";
import OrderManager from "@/components/admin/OrderManager";
import MarketingDashboard from "@/components/admin/MarketingDashboard";
import BroadcastForm from "@/components/admin/BroadcastForm";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";

type Tab = "overview" | "marketing" | "courses" | "orders" | "blog" | "users" | "coupons" | "withdraw" | "community" | "broadcast" | "settings";
const NAV: [Tab, string, string][] = [
  ["overview", "Tổng quan", "▦"],
  ["marketing", "Marketing", "📈"],
  ["courses", "Khóa học", "▤"],
  ["orders", "Đơn hàng", "🧾"],
  ["blog", "Blog", "📰"],
  ["users", "Học viên", "◍"],
  ["coupons", "Mã giảm giá", "%"],
  ["withdraw", "Rút tiền", "💸"],
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
          <AdminErrorBoundary key={tab} label={NAV.find(([t]) => t === tab)?.[1]}>
            {tab === "overview" && <Dashboard onGo={(t) => setTab(t as Tab)} />}
            {tab === "marketing" && <MarketingDashboard />}
            {tab === "courses" && <CourseManager />}
            {tab === "orders" && <OrderManager />}
            {tab === "blog" && <BlogManager />}
            {tab === "users" && <UserManager />}
            {tab === "coupons" && <CouponManager />}
            {tab === "withdraw" && <WithdrawManager />}
            {tab === "broadcast" && <BroadcastForm />}
            {tab === "settings" && <SettingsManager />}
            {tab === "community" && <CommunityModerator />}
          </AdminErrorBoundary>
        </div>
      </div>
    </div>
  );
}
