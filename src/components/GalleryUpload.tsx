"use client";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import { toast } from "@/components/Toaster";

// Thư viện ảnh: tải NHIỀU ảnh lên (kết quả học viên, ảnh lớp…). value = mảng URL.
export default function GalleryUpload({ value, onChange, endpoint = "/api/instructor/upload" }: { value: string[]; onChange: (urls: string[]) => void; endpoint?: string }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const list = value || [];
  async function upMany(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const small = await compressImage(file, 1400, 0.85);
        if (small.size > 4_000_000) { toast(`Bỏ qua ảnh quá lớn: ${file.name}`); continue; }
        const fd = new FormData(); fd.append("file", small); fd.append("bucket", "blog");
        const res = await fetch(endpoint, { method: "POST", body: fd });
        const r = await res.json().catch(() => ({}));
        if (res.ok && r.url) added.push(r.url);
      } catch { /* bỏ qua ảnh lỗi */ }
    }
    setBusy(false);
    if (added.length) { onChange([...list, ...added]); toast(`Đã tải ${added.length} ảnh ✓`); }
    else toast("Không tải được ảnh nào");
  }
  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {list.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-bg-soft group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/80 text-white text-sm leading-none cursor-pointer">×</button>
          </div>
        ))}
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="aspect-square rounded-lg border border-dashed border-border-strong hover:border-accent grid place-items-center text-ink-3 text-xs font-semibold cursor-pointer disabled:opacity-60">
          {busy ? "Đang tải…" : "⬆ Thêm ảnh"}
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upMany(e.target.files); e.currentTarget.value = ""; }} />
    </div>
  );
}
