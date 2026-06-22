"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { anonId, sessionId } from "@/lib/session";

function send(event: string, extra: Record<string, unknown> = {}) {
  try {
    fetch("/api/event", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ event, anon: anonId(), sid: sessionId(), path: location.pathname, ...extra }),
    }).catch(() => {});
  } catch { /* noop */ }
}

// Helper dùng chung để ghi sự kiện hành vi từ nơi khác
export function logEvent(event: string, props?: Record<string, unknown>) { send(event, { props }); }

export default function AnalyticsBeacon() {
  const pathname = usePathname();
  const enterRef = useRef<number>(Date.now());

  // Pageview + đo thời gian ở lại từng trang
  useEffect(() => {
    const r = document.referrer || "";
    const external = r && !r.startsWith(location.origin) ? r : "";
    send("pageview", { ref: external });
    enterRef.current = Date.now();
    const flush = () => { const ms = Date.now() - enterRef.current; if (ms > 1500 && ms < 6 * 3600_000) send("dwell", { props: { ms } }); enterRef.current = Date.now(); };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => { flush(); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Theo dõi CLICK nút/liên kết (CTR) — bắt sự kiện ủy quyền 1 lần
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest("button, a, [role=button]") as HTMLElement | null;
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
      if (!label) return;
      send("click", { props: { label, tag: el.tagName.toLowerCase() } });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as EventListenerOptions);
  }, []);

  return null;
}
