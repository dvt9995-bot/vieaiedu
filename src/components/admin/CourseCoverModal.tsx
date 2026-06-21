"use client";
import { useState } from "react";
import { compressImage } from "@/lib/image";
import { toast } from "@/components/Toaster";

type Role = "product" | "person" | "platform";
type Ref = { preview: string; data: string; mime: string; role: Role };
type Style = "modern" | "tech3d" | "gradient" | "photo" | "flat";
type TextMode = "app" | "ai" | "none";

const ROLE_LABEL: Record<Role, string> = { product: "Logo sản phẩm (chủ thể)", person: "Nhân vật", platform: "Logo nền tảng (góc)" };
const STYLES: [Style, string][] = [["modern", "Hiện đại tối giản"], ["tech3d", "3D công nghệ"], ["gradient", "Gradient hiện đại"], ["photo", "Ảnh thật điện ảnh"], ["flat", "Phẳng tối giản"]];

function fileToBase64(file: File): Promise<{ data: string; mime: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const url = String(r.result); resolve({ preview: url, data: url.split(",")[1] || "", mime: file.type || "image/jpeg" }); };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Vẽ tiêu đề lên ảnh nền bằng FONT THẬT (canvas) → chữ luôn sắc nét, đúng chính tả.
async function drawHeadline(baseDataUrl: string, text: string): Promise<string> {
  try { await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready; } catch { /* noop */ }
  const img = new Image();
  img.src = baseDataUrl;
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const W = 1600, H = 900;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);
  // Lớp tối bên trái cho chữ nổi
  const g = ctx.createLinearGradient(0, 0, W * 0.66, 0);
  g.addColorStop(0, "rgba(8,10,14,0.85)"); g.addColorStop(0.5, "rgba(8,10,14,0.5)"); g.addColorStop(1, "rgba(8,10,14,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const pad = 96, maxW = W * 0.55;
  const words = (text || "").trim().split(/\s+/);
  const layout = (fs: number) => {
    ctx.font = `800 ${fs}px 'Be Vietnam Pro', system-ui, sans-serif`;
    const lines: string[] = []; let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines;
  };
  let size = 96, lines = layout(size);
  while (lines.length > 4 && size > 40) { size -= 6; lines = layout(size); }
  const lh = size * 1.16;
  // gạch accent đỏ
  let y = H / 2 - (lines.length * lh) / 2 + lh / 2;
  ctx.fillStyle = "#E41E26"; ctx.fillRect(pad, y - lh / 2 - 26, 64, 7);
  y += 18;
  ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
  ctx.font = `800 ${size}px 'Be Vietnam Pro', system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  lines.forEach((ln) => { ctx.fillText(ln, pad, y); y += lh; });
  return cv.toDataURL("image/png");
}

export default function CourseCoverModal({ title, onClose, onUse }: { title: string; onClose: () => void; onUse: (url: string) => void }) {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [style, setStyle] = useState<Style>("modern");
  const [textMode, setTextMode] = useState<TextMode>("app");
  const [headline, setHeadline] = useState(title);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null); // dataUrl

  async function addRef(file?: File | null) {
    if (!file || refs.length >= 3) return;
    const small = await compressImage(file, 1024, 0.85);
    const b = await fileToBase64(small);
    setRefs((r) => [...r, { ...b, role: "product" as Role }]);
  }

  async function generate() {
    setBusy(true); setResult(null);
    const res = await fetch("/api/admin/course-cover", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, style, withText: textMode === "ai", refs: refs.map((r) => ({ data: r.data, mime: r.mime, role: r.role })) }),
    }).then((x) => x.json()).catch(() => ({}));
    if (!res.dataUrl) { setBusy(false); return toast(res.error || "Không tạo được ảnh", "error"); }
    try {
      const final = textMode === "app" ? await drawHeadline(res.dataUrl, headline || title) : res.dataUrl;
      setResult(final);
    } catch { setResult(res.dataUrl); }
    setBusy(false);
  }

  async function useImage() {
    if (!result) return;
    setSaving(true);
    const r = await fetch("/api/admin/save-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl: result }) }).then((x) => x.json()).catch(() => ({}));
    setSaving(false);
    if (r.url) { onUse(r.url); onClose(); } else toast(r.error || "Lưu ảnh thất bại", "error");
  }

  const sel = "rounded-lg border border-border-strong bg-surface text-sm px-2 py-1.5 outline-none focus:border-accent cursor-pointer";
  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-[rgba(11,12,14,.5)] backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[480px] max-h-[92dvh] overflow-y-auto rounded-2xl bg-surface border border-border shadow-lg p-6 relative">
        <button onClick={onClose} aria-label="Đóng" className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full inline-flex items-center justify-center text-ink-3 hover:text-ink hover:bg-bg-soft text-2xl leading-none cursor-pointer">×</button>

        <h3 className="text-lg font-extrabold">✨ Tạo ảnh bìa bằng AI</h3>
        <p className="text-ink-2 text-sm mt-1">Khóa: <b className="text-ink">{title || "(chưa có tên)"}</b></p>

        {/* Phong cách */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <label className="text-xs font-semibold text-ink-2 col-span-2">🎨 Phong cách</label>
          <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className={`${sel} col-span-2`}>
            {STYLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Chế độ chữ */}
        <div className="mt-3">
          <div className="text-xs font-semibold text-ink-2 mb-1.5">🔤 Tiêu đề trên ảnh</div>
          <div className="flex gap-1.5">
            {([["app", "App thêm (nét đẹp)"], ["ai", "AI vẽ chữ"], ["none", "Không chữ"]] as [TextMode, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setTextMode(k)} className={`flex-1 text-xs rounded-lg border py-2 font-semibold cursor-pointer transition-colors ${textMode === k ? "border-accent bg-accent-weak text-accent" : "border-border-strong hover:border-accent"}`}>{l}</button>
            ))}
          </div>
          {textMode === "app" && (
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Chữ hiển thị trên ảnh (ngắn gọn)" className="w-full mt-2 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
          )}
          {textMode === "app" && <p className="text-ink-3 text-[11px] mt-1">App vẽ chữ bằng font thương hiệu → luôn sắc nét, đúng chính tả.</p>}
        </div>

        {/* Ảnh tham chiếu */}
        <div className="mt-4">
          <div className="text-xs font-semibold text-ink-2 mb-1.5">Ảnh tham chiếu — tối đa 3 (tùy chọn)</div>
          <p className="text-ink-3 text-xs mb-2">Tải <b>logo sản phẩm</b> (vd Claude — chủ thể), <b>nhân vật</b>, hoặc <b>logo nền tảng</b>. <b>Chọn đúng vai trò</b> dưới mỗi ảnh.</p>
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
              <button onClick={useImage} disabled={saving} className="flex-1 rounded-full bg-accent hover:bg-accent-700 text-white font-semibold py-2.5 cursor-pointer transition-colors disabled:opacity-60">{saving ? "Đang lưu…" : "✓ Sử dụng ảnh này"}</button>
              <button onClick={generate} disabled={busy} className="rounded-full border border-border-strong hover:border-accent font-semibold px-4 py-2.5 cursor-pointer disabled:opacity-60">{busy ? "…" : "Tạo lại"}</button>
            </>
          )}
        </div>
        <p className="text-center text-ink-3 text-xs mt-2">Nano Banana 2 · tỉ lệ 16:9 · theo bộ nhận diện thương hiệu</p>
      </div>
    </div>
  );
}
