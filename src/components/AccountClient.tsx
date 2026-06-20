"use client";
import { useEffect, useState } from "react";
import StudentCard from "@/components/StudentCard";
import { toast } from "@/components/Toaster";
import {
  getMyProfile, updateMyProfile, uploadAvatar, changeEmail, changePassword, type MyProfile,
} from "@/lib/profile";

const inp = "w-full px-3 py-2.5 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent";
const lbl = "block text-xs font-semibold text-ink-2 mb-1";

export default function AccountClient() {
  const [p, setP] = useState<MyProfile | null>(null);
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { getMyProfile().then((d) => { setP(d); if (d) setEmail(d.email); }); }, []);

  if (!p) return <div className="container-x py-12 text-ink-3">Đang tải… (cần đăng nhập)</div>;
  const set = (k: keyof MyProfile, v: string) => setP({ ...p, [k]: v });

  async function saveProfile() {
    setBusy(true); setMsg("");
    const ok = await updateMyProfile(p!);
    setBusy(false);
    if (ok) { setMsg("✓ Đã lưu thông tin cá nhân."); toast("Đã lưu thông tin cá nhân"); }
    else { setMsg("Lỗi khi lưu."); toast("Lưu thất bại", "error"); }
  }
  async function onAvatar(file: File) {
    setMsg("Đang tải ảnh…"); toast("Đang tải ảnh lên…", "info");
    const url = await uploadAvatar(file);
    if (!url) { setMsg("Tải ảnh thất bại."); return toast("Tải ảnh thất bại", "error"); }
    set("avatar_url", url);
    await updateMyProfile({ avatar_url: url });
    setMsg("✓ Đã cập nhật ảnh đại diện."); toast("Đã cập nhật ảnh đại diện");
  }
  async function onChangeEmail() {
    setMsg("Đang đổi email…");
    const err = await changeEmail(email);
    if (err) { setMsg(`Lỗi: ${err}`); toast(err, "error"); }
    else { setMsg("✓ Đã gửi email xác nhận tới địa chỉ mới."); toast("Đã gửi email xác nhận tới địa chỉ mới"); }
  }
  async function onChangePassword() {
    if (pw.length < 6) return toast("Mật khẩu tối thiểu 6 ký tự", "error");
    setMsg("Đang đổi mật khẩu…");
    const err = await changePassword(pw);
    setPw("");
    if (err) { setMsg(`Lỗi: ${err}`); toast(err, "error"); }
    else { setMsg("✓ Đã đổi mật khẩu."); toast("Đã đổi mật khẩu thành công"); }
  }

  return (
    <div className="container-x py-12">
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Cài đặt tài khoản</h1>
      <p className="text-ink-2 mb-8">Quản lý thông tin cá nhân, ảnh đại diện và bảo mật.</p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          {/* Thông tin cá nhân */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-bold mb-4">Thông tin cá nhân</h2>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-bg-soft overflow-hidden flex items-center justify-center text-2xl font-bold text-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : (p.full_name[0] || "H")}
              </div>
              <label className="rounded-full border border-border-strong hover:border-accent hover:text-accent text-sm font-semibold px-4 py-2 cursor-pointer transition-colors">
                Đổi ảnh đại diện
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Họ và tên</label><input className={inp} value={p.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
              <div><label className={lbl}>Số điện thoại</label><input className={inp} value={p.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><label className={lbl}>Ngày sinh</label><input className={inp} type="date" value={p.birthdate} onChange={(e) => set("birthdate", e.target.value)} /></div>
              <div><label className={lbl}>Mã học viên</label><input className={`${inp} font-mono bg-bg-soft`} value={p.student_code} readOnly /></div>
              <div className="sm:col-span-2"><label className={lbl}>Địa chỉ</label><input className={inp} value={p.address} onChange={(e) => set("address", e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={lbl}>Giới thiệu bản thân</label><textarea className={`${inp} resize-none min-h-[70px]`} value={p.bio} onChange={(e) => set("bio", e.target.value)} /></div>
            </div>
            <button onClick={saveProfile} disabled={busy} className="mt-4 rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 cursor-pointer transition-colors">Lưu thông tin</button>
          </section>

          {/* Email */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-bold mb-4">Email đăng nhập</h2>
            <div className="flex gap-2 flex-wrap">
              <input className={`${inp} flex-1 min-w-[220px]`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button onClick={onChangeEmail} className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold px-5 cursor-pointer transition-colors">Đổi email</button>
            </div>
            <p className="text-ink-3 text-xs mt-2">Đổi email cần xác nhận qua hộp thư mới.</p>
          </section>

          {/* Mật khẩu */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-bold mb-4">Đổi mật khẩu</h2>
            <div className="flex gap-2 flex-wrap">
              <input className={`${inp} flex-1 min-w-[220px]`} type="password" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button onClick={onChangePassword} className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold px-5 cursor-pointer transition-colors">Đổi mật khẩu</button>
            </div>
          </section>

          {/* Ví của tôi */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-bold mb-4">Ví của tôi</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-card border border-border bg-gradient-to-br from-accent-weak to-transparent p-4">
                <div className="text-2xl font-extrabold text-accent">{(p.credit_balance || 0).toLocaleString("vi-VN")}đ</div>
                <div className="text-ink-3 text-xs mt-0.5">Số dư khuyến mãi · chỉ mua khóa học</div>
              </div>
              <div className="rounded-card border border-border bg-bg-soft p-4">
                <div className="text-2xl font-extrabold text-ink">{(p.real_balance || 0).toLocaleString("vi-VN")}đ</div>
                <div className="text-ink-3 text-xs mt-0.5">Số dư hoa hồng · dùng mua khóa học</div>
              </div>
            </div>
            <p className="text-ink-3 text-xs mt-3">Số dư được trừ tự động khi mua khóa học (ưu tiên khuyến mãi trước). Không quy đổi tiền mặt.</p>
          </section>

          {/* Mời bạn bè (referral) */}
          <section className="rounded-card border border-accent/25 bg-accent-weak p-6">
            <h2 className="font-bold mb-1">🎁 Mời bạn bè</h2>
            <p className="text-ink-2 text-sm mb-3">Chia sẻ liên kết của bạn — mỗi người đăng ký qua link này được tính cho bạn. Đã mời: <b className="text-accent">{p.referral_count}</b> người.</p>
            <div className="flex gap-2 flex-wrap">
              <input readOnly value={`https://vieaiedu.vn/?ref=${p.id}`} className={`${inp} flex-1 min-w-[220px] font-mono text-xs`} />
              <button
                onClick={() => { navigator.clipboard?.writeText(`https://vieaiedu.vn/?ref=${p.id}`); toast("Đã sao chép liên kết mời"); }}
                className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-5 cursor-pointer transition-colors"
              >Sao chép</button>
            </div>
          </section>

          {msg && <p className="text-sm text-ink-2">{msg}</p>}
        </div>

        {/* Thẻ học viên xem trước */}
        <div className="lg:sticky lg:top-24 justify-self-center">
          <StudentCard name={p.full_name || "Học viên"} studentId={p.student_code} avatarUrl={p.avatar_url} />
        </div>
      </div>
    </div>
  );
}
