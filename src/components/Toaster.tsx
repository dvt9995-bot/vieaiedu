"use client";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; message: string; type: ToastType; }

// Gọi từ bất kỳ component client nào: toast("Đã lưu") / toast("Lỗi", "error")
export function toast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("vie-toast", { detail: { message, type } }));
}

let seq = 0;

export default function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail as { message: string; type: ToastType };
      const id = ++seq;
      setItems((cur) => [...cur, { id, message, type }]);
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3500);
    };
    window.addEventListener("vie-toast", handler);
    return () => window.removeEventListener("vie-toast", handler);
  }, []);

  const color = (t: ToastType) => t === "error" ? "border-accent bg-accent text-white" : t === "info" ? "border-ink bg-ink text-white" : "border-success bg-success text-white";
  const icon = (t: ToastType) => t === "error" ? "✕" : t === "info" ? "ℹ" : "✓";

  return (
    <div className="fixed bottom-5 right-5 z-[400] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-lg text-sm font-semibold max-w-[340px] animate-[slideup_.2s_ease] ${color(t.type)}`}>
          <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-xs">{icon(t.type)}</span>
          <span>{t.message}</span>
        </div>
      ))}
      <style>{`@keyframes slideup{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
