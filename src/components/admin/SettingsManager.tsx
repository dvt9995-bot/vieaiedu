"use client";
import { useEffect, useState } from "react";

type S = Record<string, string>;
const GROUPS: { title: string; note?: string; fields: [string, string, boolean?][] }[] = [
  { title: "💳 Thanh toán (SePay)", fields: [
    ["sepay_account", "Số tài khoản nhận"], ["sepay_bank", "Mã ngân hàng (MB, VCB...)"], ["sepay_webhook_key", "Webhook API key", true],
  ]},
  { title: "🔌 Tích hợp & API key", note: "Để trống = dùng giá trị mặc định trong env.", fields: [
    ["bunny_library_id", "Bunny Library ID"], ["bunny_api_key", "Bunny Stream API key", true], ["bunny_token_key", "Bunny Token key (chống tải trộm)", true],
    ["resend_api_key", "Resend API key", true], ["resend_from", "Email gửi (From)"],
    ["gemini_api_key", "Google Gemini API key (blog tự động)", true],
  ]},
  { title: "📈 Tracking & Pixel", fields: [
    ["ga_id", "Google Analytics 4 ID (G-XXXX)"], ["fb_pixel_id", "Facebook Pixel ID"], ["tiktok_pixel_id", "TikTok Pixel ID"],
  ]},
  { title: "🔍 SEO", fields: [
    ["seo_title", "Tiêu đề mặc định"], ["seo_description", "Mô tả mặc định"], ["seo_og_image", "Ảnh OG (URL)"],
  ]},
];

export default function SettingsManager() {
  const [s, setS] = useState<S>({});
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState<Record<string, boolean>>({});

  useEffect(() => { fetch("/api/admin/settings").then((r) => r.json()).then((d) => { setS(d.settings || {}); setLoaded(true); }); }, []);

  async function save() {
    setMsg("Đang lưu…");
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: s }) }).then((x) => x.json());
    setMsg(r.ok ? "✓ Đã lưu. Thay đổi áp dụng ngay (không cần deploy)." : r.error || "Lỗi");
  }


  if (!loaded) return <p className="text-ink-3">Đang tải…</p>;
  const inp = "w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
  return (
    <div className="max-w-[640px]">
      <h2 className="font-bold text-lg mb-1">Cài đặt hệ thống</h2>
      <p className="text-ink-2 text-sm mb-5">Sửa cấu hình không cần code. Khóa bí mật được lưu mã hóa trong DB.</p>
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g.title} className="rounded-card border border-border p-5">
            <h3 className="font-semibold mb-1">{g.title}</h3>
            {g.note && <p className="text-ink-3 text-xs mb-3">{g.note}</p>}
            <div className="space-y-3 mt-3">
              {g.fields.map(([key, label, secret]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">{label}</label>
                  <div className="flex gap-2">
                    <input
                      className={inp} type={secret && !show[key] ? "password" : "text"}
                      value={s[key] || ""} onChange={(e) => setS({ ...s, [key]: e.target.value })}
                      placeholder={secret ? "••••••" : ""}
                    />
                    {secret && <button onClick={() => setShow({ ...show, [key]: !show[key] })} className="text-xs text-ink-3 px-2 cursor-pointer">{show[key] ? "Ẩn" : "Hiện"}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-5 flex-wrap">
        <button onClick={save} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-2.5 cursor-pointer transition-colors">Lưu tất cả</button>
        {msg && <span className="text-sm text-ink-2">{msg}</span>}
      </div>
    </div>
  );
}
