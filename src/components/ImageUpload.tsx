"use client";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import { toast } from "@/components/Toaster";

// Ô nhập ảnh dùng chung: xem trước + dán URL + NÚT TẢI ẢNH LÊN. endpoint mặc định cho giảng viên.
export default function ImageUpload({ value, onChange, endpoint = "/api/instructor/upload", placeholder = "Dán URL hoặc tải ảnh lên", size = "md" }: { value: string; onChange: (url: string) => void; endpoint?: string; placeholder?: string; size?: "sm" | "md" }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const inp = "w-full px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  async function up(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Chỉ chấp nhận file ảnh");
    setBusy(true);
    try {
      const small = await compressImage(file, 1200, 0.85);
      if (small.size > 4_000_000) { setBusy(false); return toast("Ảnh quá lớn (>4MB)"); }
      const fd = new FormData(); fd.append("file", small); fd.append("bucket", "blog");
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const r = await res.json().catch(() => ({}));
      if (res.ok && r.url) { onChange(r.url); toast("Đã tải ảnh ✓"); } else toast(r.error || "Tải ảnh thất bại");
    } catch (e) { toast("Lỗi ảnh: " + ((e as Error)?.message || "thử lại")); }
    finally { setBusy(false); }
  }
  const dim = size === "sm" ? "w-12 h-12 rounded-full" : "w-20 h-20 rounded-lg";
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${dim} bg-bg-soft border border-border overflow-hidden shrink-0 grid place-items-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <span className="text-ink-3 text-[10px]">Ảnh</span>}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <input className={inp} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="flex gap-2 items-center">
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="rounded-lg border border-border-strong hover:border-accent text-xs font-semibold px-3 py-1.5 cursor-pointer disabled:opacity-60">{busy ? "Đang tải…" : "⬆ Tải ảnh lên"}</button>
          {value && <button type="button" onClick={() => onChange("")} className="text-xs text-accent font-semibold px-1 cursor-pointer">Xóa</button>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { up(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      </div>
    </div>
  );
}
