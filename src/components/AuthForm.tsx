"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, signInWithGoogle } from "@/app/auth/actions";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const reg = mode === "register";
  const [state, action, pending] = useActionState(reg ? signUp : signIn, {} as { error?: string });

  return (
    <div className="container-x py-20 flex justify-center">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="flex justify-center mb-8" aria-label="VIE AI EDU">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VIE AI EDU" className="h-14 w-auto" />
        </Link>
        <div className="rounded-[18px] border border-border bg-surface p-8 shadow-soft">
          <h1 className="text-2xl font-extrabold tracking-tight">{reg ? "Tạo tài khoản" : "Đăng nhập"}</h1>
          <p className="text-ink-2 text-sm mt-1 mb-6">{reg ? "Miễn phí, chỉ mất 30 giây" : "Chào mừng trở lại"}</p>

          <form action={signInWithGoogle}>
            <button className="w-full flex items-center justify-center gap-2 rounded-full border border-border-strong hover:border-ink-3 py-2.5 font-semibold text-sm mb-4 cursor-pointer transition-colors">
              <span className="text-lg">G</span> Tiếp tục với Google
            </button>
          </form>

          <div className="flex items-center gap-3 text-ink-3 text-xs my-4"><span className="flex-1 h-px bg-border" />hoặc<span className="flex-1 h-px bg-border" /></div>

          <form action={action}>
            {reg && (<><label className="block text-xs font-semibold mt-2 mb-1.5">Họ và tên</label><input name="full_name" className="auth-input" placeholder="Nguyễn Văn A" /></>)}
            <label className="block text-xs font-semibold mt-4 mb-1.5">Email</label>
            <input name="email" type="email" required className="auth-input" placeholder="ban@email.com" />
            <label className="block text-xs font-semibold mt-4 mb-1.5">Mật khẩu</label>
            <input name="password" type="password" required minLength={6} className="auth-input" placeholder="••••••••" />
            {state?.error && <p className="text-accent text-sm mt-3">{state.error}</p>}
            <button disabled={pending} className="mt-6 w-full rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold py-3 cursor-pointer transition-colors">
              {pending ? "Đang xử lý…" : reg ? "Tạo tài khoản" : "Đăng nhập"}
            </button>
          </form>

          <p className="text-center text-sm text-ink-2 mt-5">
            {reg ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
            <Link href={reg ? "/login" : "/register"} className="text-accent font-semibold">{reg ? "Đăng nhập" : "Tạo ngay"}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
