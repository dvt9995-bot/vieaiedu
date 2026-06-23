"use client";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/Toaster";

export const isVideoUrl = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u || "");

// Thư viện ẢNH + VIDEO: ảnh nén & upload qua server; video upload thẳng Supabase (signed, ≤50MB).
export default function GalleryUpload({ value, onChange, endpoint = "/api/instructor/upload" }: { value: string[]; onChange: (urls: string[]) => void; endpoint?: string }) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const list = value || [];

  async function uploadImage(file: File): Promise<string | null> {
    const small = await compressImage(file, 1400, 0.85);
    if (small.size > 4_000_000) { toast(`Bỏ qua ảnh quá lớn: ${file.name}`); return null; }
    const fd = new FormData(); fd.append("file", small); fd.append("bucket", "blog");
    const res = await fetch(endpoint, { method: "POST", body: fd });
    const r = await res.json().catch(() => ({}));
    return res.ok && r.url ? r.url : null;
  }
  async function uploadVideo(file: File): Promise<string | null> {
    if (file.size > 50_000_000) { toast(`Video quá lớn (>50MB): ${file.name} — hãy nén lại`); return null; }
    const c = createClient();
    if (!c) { toast("Chưa kết nối Supabase"); return null; }
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const sig = await fetch("/api/instructor/signed-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ext }) }).then((x) => x.json()).catch(() => ({}));
    if (!sig.token) { toast(sig.error || "Không tạo được link tải video"); return null; }
    const { error } = await c.storage.from("hero").uploadToSignedUrl(sig.path, sig.token, file, { contentType: file.type || "video/mp4" });
    if (error) { toast("Tải video lỗi: " + error.message); return null; }
    return sig.publicUrl as string;
  }

  async function upMany(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const url = file.type.startsWith("video/") ? await uploadVideo(file) : file.type.startsWith("image/") ? await uploadImage(file) : null;
        if (url) added.push(url);
      } catch { /* bỏ qua file lỗi */ }
    }
    setBusy(false);
    if (added.length) { onChange([...list, ...added]); toast(`Đã tải ${added.length} mục ✓`); }
    else toast("Không tải được mục nào");
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {list.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-bg-soft group">
            {isVideoUrl(url)
              ? <video src={url} className="w-full h-full object-cover" muted playsInline />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src={url} alt="" className="w-full h-full object-cover" />}
            {isVideoUrl(url) && <span className="absolute inset-0 grid place-items-center text-white/90 text-2xl pointer-events-none">▶</span>}
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/80 text-white text-sm leading-none cursor-pointer">×</button>
          </div>
        ))}
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="aspect-square rounded-lg border border-dashed border-border-strong hover:border-accent grid place-items-center text-ink-3 text-xs font-semibold cursor-pointer disabled:opacity-60 text-center px-1">
          {busy ? "Đang tải…" : "⬆ Thêm ảnh/video"}
        </button>
      </div>
      <p className="text-[11px] text-ink-3 mt-1.5">Ảnh hoặc video (≤50MB/video). Chọn nhiều cùng lúc.</p>
      <input ref={ref} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { upMany(e.target.files); e.currentTarget.value = ""; }} />
    </div>
  );
}
