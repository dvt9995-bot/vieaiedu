"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function anonId(): string {
  try {
    let id = localStorage.getItem("vie_anon");
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("vie_anon", id); }
    return id;
  } catch { return ""; }
}

// Helper dùng chung để ghi sự kiện hành vi (gọi từ nơi khác nếu cần)
export function logEvent(event: string, props?: Record<string, unknown>) {
  try {
    fetch("/api/event", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ event, path: location.pathname, anon: anonId(), props }),
    }).catch(() => {});
  } catch { /* noop */ }
}

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      // Chỉ gửi referrer NGOÀI (nguồn thật) — bỏ qua điều hướng nội bộ
      const r = document.referrer || "";
      const external = r && !r.startsWith(location.origin) ? r : "";
      fetch("/api/event", {
        method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ event: "pageview", path: pathname, ref: external, anon: anonId() }),
      }).catch(() => {});
    } catch { /* noop */ }
  }, [pathname]);
  return null;
}
