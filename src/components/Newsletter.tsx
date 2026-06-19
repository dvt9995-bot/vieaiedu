"use client";
import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/subscribe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setState(res.ok ? "ok" : "err");
    if (res.ok) setEmail("");
  }

  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-ink-3 mb-3.5 font-semibold">Nhận tin AI mỗi tuần</h4>
      {state === "ok" ? (
        <p className="text-sm text-success font-medium">✓ Đã đăng ký! Cảm ơn bạn.</p>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@cuaban.com"
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-accent"
          />
          <button className="rounded-lg bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-3.5 cursor-pointer transition-colors">Đăng ký</button>
        </form>
      )}
      {state === "err" && <p className="text-xs text-accent mt-1.5">Đăng ký lỗi, thử lại sau.</p>}
    </div>
  );
}
