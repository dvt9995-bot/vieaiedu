"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatVND } from "@/lib/format";
import FilterMenu from "@/components/FilterMenu";

interface CourseOrder { id: string; title: string; slug: string; format: string; status: string; amount: number; wallet_used: number; coupon_code?: string | null; created_at: string; paid_at?: string | null; }
interface ShopItem { title: string; qty: number }
interface ShopOrder { id: string; code?: string; total: number; status: string; has_physical?: boolean; created_at: string; shop_order_items?: ShopItem[] }

// Nhãn + màu trạng thái dùng chung
const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Đã thanh toán", cls: "bg-success/15 text-success" },
  pending: { label: "Chờ thanh toán", cls: "bg-gold/15 text-warning" },
  shipped: { label: "Đang giao", cls: "bg-accent-weak text-accent" },
  delivered: { label: "Đã giao", cls: "bg-success/15 text-success" },
  completed: { label: "Hoàn tất", cls: "bg-success/15 text-success" },
  cancelled: { label: "Đã hủy", cls: "bg-bg-soft text-ink-3" },
  expired: { label: "Hết hạn", cls: "bg-bg-soft text-ink-3" },
  refunded: { label: "Đã hoàn tiền", cls: "bg-bg-soft text-ink-3" },
  disputed: { label: "Đang khiếu nại", cls: "bg-warning-weak text-warning" },
};
const PAID = ["paid", "shipped", "delivered", "completed"];
const fdate = (s?: string | null) => s ? new Date(s).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "";
const bucket = (status: string) => PAID.includes(status) ? "paid" : status === "pending" ? "pending" : "other";

interface Entry {
  id: string; kind: "course" | "shop"; title: string; amount: number; status: string; ts: number;
  href: string; actionLabel: string; sub: string; badge?: string;
}

export default function PurchaseHistory() {
  const [courses, setCourses] = useState<CourseOrder[] | null>(null);
  const [shop, setShop] = useState<ShopOrder[]>([]);
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then((d) => setCourses(d.orders || [])).catch(() => setCourses([]));
    fetch("/api/shop/orders").then((r) => r.json()).then((d) => setShop(d.orders || [])).catch(() => {});
  }, []);

  // Gộp tất cả đơn vào 1 danh sách thống nhất, sắp theo thời gian mới nhất
  const entries = useMemo<Entry[]>(() => {
    const cs: Entry[] = (courses || []).map((o) => ({
      id: `c-${o.id}`, kind: "course", title: o.title, amount: o.amount, status: o.status,
      ts: new Date(o.paid_at || o.created_at).getTime(),
      href: o.format === "live" ? `/live/${o.slug}` : o.format === "bundle" ? "/courses" : `/learn/${o.slug}`,
      actionLabel: o.format === "live" ? "Vào lớp →" : "Vào học →",
      sub: `${fdate(o.paid_at || o.created_at)}${o.coupon_code ? ` · mã ${o.coupon_code}` : ""}${o.wallet_used > 0 ? ` · ví ${formatVND(o.wallet_used)}` : ""}`,
      badge: o.format === "live" ? "LIVE" : o.format === "bundle" ? "Trọn bộ" : "Khóa học",
    }));
    const ss: Entry[] = shop.map((o) => ({
      id: `s-${o.id}`, kind: "shop", title: (o.shop_order_items || []).map((it) => `${it.title}×${it.qty}`).join(", ") || "Đơn sản phẩm",
      amount: o.total, status: o.status, ts: new Date(o.created_at).getTime(),
      href: "/shop/orders", actionLabel: "Chi tiết →",
      sub: `${fdate(o.created_at)}${o.code ? ` · #${o.code}` : ""}`, badge: "Sản phẩm",
    }));
    return [...cs, ...ss].sort((a, b) => b.ts - a.ts);
  }, [courses, shop]);

  const stats = useMemo(() => {
    const spent = entries.filter((e) => PAID.includes(e.status)).reduce((n, e) => n + (e.amount || 0), 0);
    const walletSpent = (courses || []).filter((o) => PAID.includes(o.status)).reduce((n, o) => n + (o.wallet_used || 0), 0);
    return {
      spent: spent + walletSpent, total: entries.length,
      paid: entries.filter((e) => PAID.includes(e.status)).length,
      pending: entries.filter((e) => e.status === "pending").length,
    };
  }, [entries, courses]);

  const filtered = entries.filter((e) => (kind === "all" || e.kind === kind) && (status === "all" || bucket(e.status) === status));
  const loading = courses === null;
  const activeFilter = kind !== "all" || status !== "all";

  return (
    <div className="space-y-6">
      {/* Thống kê chi tiêu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["💸 Tổng đã chi", formatVND(stats.spent), "text-accent"],
          ["🧾 Tổng số đơn", String(stats.total), ""],
          ["✅ Đã thanh toán", String(stats.paid), "text-success"],
          ["⏳ Chờ thanh toán", String(stats.pending), "text-warning"],
        ].map(([l, v, cls], i) => (
          <div key={i} className="rounded-card border border-border bg-surface p-4">
            <div className={`text-xl font-extrabold tracking-tight ${cls}`}>{v}</div>
            <div className="text-ink-3 text-xs mt-0.5">{l}</div>
          </div>
        ))}
      </div>

      {/* Bộ lọc phễu (đồng bộ toàn app) */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterMenu
          groups={[
            { key: "kind", label: "Loại đơn", value: kind, onChange: setKind, options: [{ value: "all", label: "Tất cả loại" }, { value: "course", label: "🎓 Khóa học" }, { value: "shop", label: "🛍️ Sản phẩm" }] },
            { key: "status", label: "Trạng thái", value: status, onChange: setStatus, options: [{ value: "all", label: "Tất cả trạng thái" }, { value: "paid", label: "✅ Đã thanh toán" }, { value: "pending", label: "⏳ Chờ thanh toán" }, { value: "other", label: "Đã hủy / hoàn / khác" }] },
          ]}
        />
        <span className="text-sm text-ink-3">{loading ? "Đang tải…" : `${filtered.length} đơn${activeFilter ? ` (trên tổng ${entries.length})` : ""}`}</span>
      </div>

      {/* Danh sách thống nhất */}
      {loading ? <p className="text-ink-3 text-sm">Đang tải…</p>
        : entries.length === 0 ? <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Bạn chưa có đơn hàng nào. <Link href="/courses" className="text-accent font-semibold">Khám phá khóa học →</Link></div>
        : filtered.length === 0 ? <div className="rounded-card border border-border bg-surface p-10 text-center text-ink-3">Không có đơn nào khớp bộ lọc.</div>
        : (
          <div className="space-y-2.5">
            {filtered.map((e) => {
              const st = STATUS[e.status] || STATUS.pending;
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-border bg-surface p-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {e.badge && <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 mr-1.5 align-middle ${e.kind === "shop" ? "bg-bg-soft text-ink-2" : e.badge === "LIVE" ? "bg-accent-weak text-accent" : "bg-bg-soft text-ink-2"}`}>{e.badge}</span>}
                      {e.title}
                    </div>
                    <div className="text-xs text-ink-3 mt-0.5">{e.sub}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{formatVND(e.amount)}</div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  {PAID.includes(e.status) && <a href={e.href} className="text-xs font-semibold text-accent hover:underline shrink-0 basis-full sm:basis-auto sm:ml-2">{e.actionLabel}</a>}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
