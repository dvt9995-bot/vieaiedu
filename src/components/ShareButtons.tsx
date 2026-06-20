"use client";
import { useState } from "react";
import { toast } from "./Toaster";
import { track } from "@/lib/analytics";

// Nút chia sẻ Facebook + sao chép link. `path` là đường dẫn tương đối (vd /p/abc).
export default function ShareButtons({ path }: { path: string }) {
  const [url] = useState(() => (typeof window !== "undefined" ? window.location.origin : "https://vieaiedu.vn") + path);
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return (
    <div className="flex items-center gap-2">
      <a href={fb} target="_blank" rel="noopener" onClick={() => track("share", { method: "facebook", content_id: path })} className="inline-flex items-center gap-1.5 rounded-full bg-[#1877f2] text-white text-sm font-semibold px-3.5 py-1.5 hover:opacity-90 transition-opacity">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0022 12z" /></svg>
        Facebook
      </a>
      <button onClick={() => { navigator.clipboard?.writeText(url); track("share", { method: "copy_link", content_id: path }); toast("Đã sao chép liên kết"); }} className="inline-flex items-center gap-1.5 rounded-full border border-border-strong hover:border-accent hover:text-accent text-sm font-semibold px-3.5 py-1.5 cursor-pointer transition-colors">
        🔗 Sao chép
      </button>
    </div>
  );
}
