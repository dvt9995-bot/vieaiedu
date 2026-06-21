"use client";
import { useState } from "react";
import { compressImage } from "@/lib/image";
import { toast } from "@/components/Toaster";

type Role = "product" | "person" | "platform";
type Ref = { preview: string; data: string; mime: string; role: Role };
const ROLE_LABEL: Record<Role, string> = { product: "Logo sản phẩm (chủ thể)", person: "Nhân vật", platform: "Logo nền tảng (góc)" };

function fileToBase64(file: File): Promise<{ data: string; mime: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const url = String(r.result); resolve({ preview: url, data: url.split(",")[1] || "", mime: file.type || "image/jpeg" }); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Popup tạo ảnh bìa bằng AI: cho tải tối đa 3 ảnh tham chiếu (nhân vật + logo, tùy chọn).
export default function CourseCoverModal({ title, onClose, onUse }: { title: string; onClose: () => void; onUse: (url: string) => void }) {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function addRef(file?: File | null) {
    if (!file || refs.length >= 3) return;
    const small = await compressImage(file, 1024, 0.85);
    const b = await fileToBase64(small);
    setRefs((r) => [...r, { ...b, role: "product" as Role }]);
  }

  async function generate() {
    setBusy(true); setResult(null);
    const body = { title, refs: refs.map((r) => ({ data: r.data, mime: r.mime, role: r.role })) };
    const res = await fetch("/api/admin/course-cover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({}));
    setBusy(false);
    if (res.url) setResult(res.url);
    else toast(res.error || "Không tạo được ảnh", "error");
  }

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[480px] max-h-[92dvh] overflow-y-auto rounded-2xl bg-surface border border-border shadow-lg p-6 relative">
        <button onClick={onClose} aria-label="Đóng" className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-3 hover:text-ink hover:bg-bg-soft text-2xl leading-none cursor-pointer">×</button>

        <h3 className="text-lg font-extrabold">✨ Tạo ảnh bìa bằng AI</h3>
        <p className="text-ink-2 text-sm mt-1">Ảnh sinh dựa trên tên khóa: <b className="text-ink">{title || "(chưa có tên)"}</b></p>

        {/* Ảnh tham chiếu (tùy chọn) */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-ink-2 mb-1.5">Ảnh tham chiếu — tối đa 3 (tùy chọn)</div>
          <p className="text-ink-3 text-xs mb-2">Tải <b>logo sản phẩm</b> (vd Claude — sẽ làm chủ thể), <b>nhân vật</b>, hoặc <b>logo nền tảng</b>. <b>Chọn đúng vai trò</b> dưới mỗi ảnh để AI đặt đúng chỗ.</p>
          <div className="flex gap-3 flex-wrap">
            {refs.map((r, i) => (
              <div key={i} className="w-28">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.preview} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setRefs((cur) => cur.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none cursor-pointer">×</button>
                </div>
                <select value={r.role} onChange={(e) => setRefs((cur) => cur.map((x, j) => j === i ? { ...x, role: e.target.value as Role } : x))} className="w-full mt-1 text-[11px] rounded border border-border-strong bg-surface px-1 py-1 outline-none focus:border-accent cursor-pointer">
                  {(Object.keys(ROLE_LABEL) as Role[]).map((k) => <option key={k} value={k}>{ROLE_LABEL[k]}</option>)}
                </select>
              </div>
            ))}
            {refs.length < 3 && (
              <label className="w-28 aspect-square rounded-lg border border-dashed border-border-strong grid place-items-center text-ink-3 text-2xl cursor-pointer hover:border-accent">
                +
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { addRef(e.target.files?.[0]); e.currentTarget.value = ""; }} />
              </label>
            )}
          </div>
        </div>

        {/* Kết quả */}
        {result && (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result} alt="Ảnh bìa AI" className="w-full aspect-video object-cover rounded-lg border border-border" />
          </div>
        )}

        <div className="flex gap-2 mt-5">
          {!result ? (
            <button onClick={generate} disabled={busy} className="flex-1 rounded-full bg-ink text-white font-semibold py-2.5 cursor-pointer disabled:opacity-60">
              {busy ? "Đang tạo ảnh… (~10–40s)" : "Tạo ảnh bìa"}
            </button>
          ) : (
            <>
              <button onClick={() => { onUse(result); onClose(); }} className="flex-1 rounded-full bg-accent hover:bg-accent-700 text-white font-semibold py-2.5 cursor-pointer transition-colors">✓ Sử dụng ảnh này</button>
              <button onClick={generate} disabled={busy} className="rounded-full border border-border-strong hover:border-accent font-semibold px-4 py-2.5 cursor-pointer disabled:opacity-60">{busy ? "Đang tạo…" : "Tạo lại"}</button>
            </>
          )}
        </div>
        <p className="text-center text-ink-3 text-xs mt-2">Ảnh do AI tạo theo bộ nhận diện thương hiệu · tỉ lệ 16:9</p>
      </div>
    </div>
  );
}
