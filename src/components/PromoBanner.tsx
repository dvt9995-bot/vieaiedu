"use client";
import { useEffect, useState } from "react";
import { toast } from "./Toaster";

interface Promo { code: string; percent_off: number; expires_at: string }

export default function PromoBanner() {
  const [promo, setPromo] = useState<Promo | null>(null);
  const [left, setLeft] = useState("");
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("vie:promo_x")) return;
    fetch("/api/promo").then((r) => r.json()).then((d) => { if (d.promo) { setPromo(d.promo); setHidden(false); } }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!promo) return;
    const tick = () => {
      const ms = new Date(promo.expires_at).getTime() - Date.now();
      if (ms <= 0) { setHidden(true); return; }
      const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
      setLeft(d > 0 ? `${d} ngày ${h}h` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [promo]);

  if (hidden || !promo) return null;
  return (
    <div className="bg-ink text-white text-sm">
      <div className="container-x flex items-center justify-center gap-2 py-2 flex-wrap text-center">
        <span>🔥 Ưu đãi <b className="text-gold">-{promo.percent_off}%</b> · mã</span>
        <button onClick={() => { navigator.clipboard?.writeText(promo.code); toast(`Đã sao chép mã ${promo.code}`); }} className="font-mono font-bold bg-white/15 hover:bg-white/25 rounded px-2 py-0.5 cursor-pointer">{promo.code}</button>
        <span>· kết thúc sau <b className="text-gold tabular-nums">{left}</b></span>
        <button onClick={() => { setHidden(true); try { sessionStorage.setItem("vie:promo_x", "1"); } catch {} }} className="ml-2 text-white/60 hover:text-white cursor-pointer" aria-label="Đóng">✕</button>
      </div>
    </div>
  );
}
