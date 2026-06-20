"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CATS: [string, string][] = [
  ["transactional", "Giao dịch (mua khóa, hoàn tiền)"],
  ["learning", "Học tập (hoàn thành, nhắc học)"],
  ["community", "Cộng đồng"],
  ["promo", "Khuyến mãi & ưu đãi"],
  ["system", "Hệ thống"],
];
type Prefs = Record<string, { email?: boolean; push?: boolean }>;

function urlB64ToU8(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...b].map((c) => c.charCodeAt(0)));
}

export default function SettingsNotifications({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [prefs, setPrefs] = useState<Prefs>({});
  const [loaded, setLoaded] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "on" | "denied" | "unsupported">("idle");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("notification_prefs").select("prefs").eq("user_id", user.id).maybeSingle();
          setPrefs((data?.prefs as Prefs) || {});
        }
      }
      setLoaded(true);
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") setPushState("on");
        else if (Notification.permission === "denied") setPushState("denied");
      } else setPushState("unsupported");
    })();
  }, []);

  async function setPref(cat: string, ch: "email" | "push", val: boolean) {
    const next = { ...prefs, [cat]: { ...prefs[cat], [ch]: val } };
    setPrefs(next);
    const supabase = createClient(); if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    await supabase.from("notification_prefs").upsert({ user_id: user.id, prefs: next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  }

  async function enablePush() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToU8(vapidPublicKey) });
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
      setPushState("on");
    } catch { setPushState("denied"); }
  }

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${on ? "bg-accent" : "bg-border-strong"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );

  return (
    <div className="container-x py-12 max-w-[640px]">
      <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight mb-2">Cài đặt thông báo</h1>
      <p className="text-ink-2 mb-8">Chọn cách bạn muốn nhận thông báo. Thông báo trong app luôn bật.</p>

      {/* Web Push */}
      <div className="rounded-card border border-border bg-bg-soft p-5 mb-8 flex items-center justify-between gap-4">
        <div>
          <div className="font-bold">Thông báo đẩy (trên thiết bị)</div>
          <div className="text-ink-2 text-sm mt-0.5">Nhận thông báo ngay cả khi không mở web — hợp khi cài app lên điện thoại.</div>
        </div>
        {pushState === "on" ? <span className="text-success font-semibold text-sm whitespace-nowrap">✓ Đã bật</span>
          : pushState === "denied" ? <span className="text-ink-3 text-sm whitespace-nowrap">Bị chặn</span>
          : pushState === "unsupported" ? <span className="text-ink-3 text-sm">Không hỗ trợ</span>
          : <button onClick={enablePush} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-4 py-2 cursor-pointer whitespace-nowrap">Bật</button>}
      </div>

      {!loaded ? <p className="text-ink-3">Đang tải…</p> : (
        <div className="rounded-card border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-5 py-3 bg-bg-soft text-xs uppercase tracking-wide text-ink-3 font-semibold">
            <span>Loại thông báo</span><span>Email</span><span>Đẩy</span>
          </div>
          {CATS.map(([key, label]) => (
            <div key={key} className="grid grid-cols-[1fr_auto_auto] gap-x-6 items-center px-5 py-4 border-t border-border">
              <span className="text-sm font-medium">{label}</span>
              <Toggle on={prefs[key]?.email ?? true} onClick={() => setPref(key, "email", !(prefs[key]?.email ?? true))} />
              <Toggle on={prefs[key]?.push ?? true} onClick={() => setPref(key, "push", !(prefs[key]?.push ?? true))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
