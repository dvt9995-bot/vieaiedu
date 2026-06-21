"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toaster";
import { createClient } from "@/lib/supabase/client";

type S = Record<string, string>;
// field = [key, label, secret?, multiline?]
const GROUPS: { title: string; note?: string; fields: [string, string, boolean?, boolean?][] }[] = [
  { title: "💳 Thanh toán (SePay)", fields: [
    ["sepay_account", "Số tài khoản nhận"], ["sepay_bank", "Mã ngân hàng (MB, VCB...)"], ["sepay_webhook_key", "Webhook API key", true],
  ]},
  { title: "🔌 Tích hợp & API key", note: "Để trống = dùng giá trị mặc định trong env.", fields: [
    ["bunny_library_id", "Bunny Library ID"], ["bunny_token_key", "Bunny Token key (chống tải trộm)", true],
    ["resend_api_key", "Resend API key", true], ["resend_from", "Email gửi (From)"],
    ["gemini_api_key", "Google Gemini API key (blog tự động)", true],
    ["youtube_api_key", "YouTube Data API key (đồng bộ bình luận video)", true],
  ]},
  { title: "📰 Blog tự động (AI)", note: "Model AI viết lại tin + danh sách nguồn.", fields: [
    ["gemini_model", "Model Gemini (mặc định gemini-2.5-flash)"],
    ["blog_feeds", "Nguồn tin — mỗi dòng: url | Tên nguồn", false, true],
  ]},
  { title: "📈 Tracking & Pixel", fields: [
    ["ga_id", "Google Analytics 4 ID (G-XXXX)"], ["fb_pixel_id", "Facebook Pixel ID"], ["tiktok_pixel_id", "TikTok Pixel ID"],
  ]},
  { title: "🔍 SEO", fields: [
    ["seo_title", "Tiêu đề mặc định"], ["seo_description", "Mô tả mặc định"], ["seo_og_image", "Ảnh OG (URL)"],
  ]},
  { title: "💰 Ví & Hoa hồng", note: "Nhập số (VND/%). Để trống = tắt.", fields: [
    ["signup_credit", "Tặng người mới (đ khuyến mãi)"],
    ["referral_reward_credit", "Thưởng người giới thiệu khi có bạn đăng ký (đ)"],
    ["referral_commission_pct", "Hoa hồng giới thiệu khi bạn mua khóa thật (%)"],
    ["min_withdraw", "Số tiền rút tối thiểu (đ)"],
  ]},
  { title: "🎓 Chứng chỉ", note: "Điều kiện & thông tin in trên chứng chỉ.", fields: [
    ["cert_required_paid", "Số khóa TRẢ PHÍ tối thiểu để được cấp chứng chỉ (mặc định 5)"],
    ["cert_signer", "Người ký chứng chỉ (mặc định Long Nam)"],
    ["cert_signer_title", "Chức danh người ký (mặc định Giám đốc đào tạo)"],
  ]},
];

export default function SettingsManager() {
  const [s, setS] = useState<S>({});
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [upBusy, setUpBusy] = useState("");

  useEffect(() => { fetch("/api/admin/settings").then((r) => r.json()).then((d) => { setS(d.settings || {}); setLoaded(true); }); }, []);

  async function uploadHero(file: File, key: "hero_bg_image" | "hero_bg_video") {
    const isVideo = key === "hero_bg_video";
    if (file.size > 50_000_000) return toast(isVideo ? "Video quá lớn (>50MB) — hãy nén lại" : "Ảnh quá lớn (>50MB)", "error");
    setUpBusy(key);
    const c = createClient();
    if (!c) { setUpBusy(""); return toast("Chưa kết nối Supabase", "error"); }
    // Xin signed upload URL từ server (service-role) rồi upload thẳng lên Supabase
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
    const sig = await fetch("/api/admin/hero-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ext }) }).then((x) => x.json()).catch(() => ({}));
    if (!sig.token) { setUpBusy(""); return toast(sig.error || "Không tạo được link tải lên", "error"); }
    const { error } = await c.storage.from("hero").uploadToSignedUrl(sig.path, sig.token, file, { contentType: file.type || undefined });
    setUpBusy("");
    if (error) return toast("Tải lên thất bại: " + error.message, "error");
    setS((cur) => ({ ...cur, [key]: sig.publicUrl }));
    toast("Đã tải lên — nhớ bấm Lưu tất cả");
  }

  async function save() {
    setMsg("Đang lưu…");
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: s }) }).then((x) => x.json());
    if (r.ok) { setMsg("✓ Đã lưu. Thay đổi áp dụng ngay (không cần deploy)."); toast("Đã lưu cấu hình — áp dụng ngay"); }
    else { setMsg(r.error || "Lỗi"); toast(r.error || "Lưu thất bại", "error"); }
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
              {g.fields.map(([key, label, secret, multiline]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-ink-2 mb-1">{label}</label>
                  {multiline ? (
                    <textarea
                      className={`${inp} min-h-[90px] font-mono`} rows={4}
                      value={s[key] || ""} onChange={(e) => setS({ ...s, [key]: e.target.value })}
                      placeholder={"https://vd.com/rss | Tên nguồn"}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <input
                        className={inp} type={secret && !show[key] ? "password" : "text"}
                        value={s[key] || ""} onChange={(e) => setS({ ...s, [key]: e.target.value })}
                        placeholder={secret ? "••••••" : ""}
                      />
                      {secret && <button onClick={() => setShow({ ...show, [key]: !show[key] })} className="text-xs text-ink-3 px-2 cursor-pointer">{show[key] ? "Ẩn" : "Hiện"}</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Nền Hero (ảnh/video) */}
        <div className="rounded-card border border-border p-5">
          <h3 className="font-semibold mb-1">🎬 Nền khu Hero (trang chủ)</h3>
          <p className="text-ink-3 text-xs mb-3">Tải <b>video</b> (ưu tiên) hoặc <b>ảnh</b> làm nền. Có video → tự phát, lặp, tắt tiếng; chữ chuyển sang trắng. Để trống cả hai = dùng nền mặc định. Khuyến nghị video MP4 16:9, ≤50MB.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {([["hero_bg_video", "Video nền", "video/*"], ["hero_bg_image", "Ảnh nền / poster", "image/*"]] as const).map(([key, label, accept]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-ink-2 mb-1.5">{label}</label>
                {s[key] ? (
                  <div className="rounded-lg border border-border overflow-hidden bg-bg-soft mb-2">
                    {key === "hero_bg_video"
                      ? <video src={s[key]} className="w-full h-28 object-cover" muted playsInline />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={s[key]} alt="" className="w-full h-28 object-cover" />}
                  </div>
                ) : <div className="rounded-lg border border-dashed border-border h-28 grid place-items-center text-ink-3 text-xs mb-2">Chưa có</div>}
                <div className="flex gap-2">
                  <label className="rounded-lg border border-border-strong hover:border-accent text-sm font-semibold px-3 py-1.5 cursor-pointer">
                    {upBusy === key ? "Đang tải…" : "Tải lên"}
                    <input type="file" accept={accept} className="hidden" disabled={!!upBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f, key); }} />
                  </label>
                  {s[key] && <button onClick={() => setS((cur) => ({ ...cur, [key]: "" }))} className="text-sm text-accent font-semibold px-2 cursor-pointer">Xóa</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-5 flex-wrap">
        <button onClick={save} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-2.5 cursor-pointer transition-colors">Lưu tất cả</button>
        {msg && <span className="text-sm text-ink-2">{msg}</span>}
      </div>
    </div>
  );
}
