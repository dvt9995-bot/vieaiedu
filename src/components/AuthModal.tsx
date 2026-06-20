"use client";
import { createContext, useContext, useState, useActionState, type ReactNode } from "react";
import { authAction } from "@/app/auth/actions";

type Mode = "login" | "register";
const AuthCtx = createContext<{ open: (m?: Mode) => void } | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthCtx);
  if (!ctx) return { open: () => {} };
  return ctx;
}

export default function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const reg = mode === "register";
  const [state, action, pending] = useActionState(authAction, {} as { error?: string });

  return (
    <AuthCtx.Provider value={{ open: (m: Mode = "login") => setMode(m) }}>
      {children}
      {mode && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-5 bg-[rgba(11,12,14,.4)] backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setMode(null)}
        >
          <div className="w-full max-w-[400px] max-h-[90dvh] overflow-y-auto rounded-[18px] border border-border bg-surface p-6 sm:p-8 shadow-lg relative">
            <button
              onClick={() => setMode(null)}
              className="absolute top-2.5 right-2.5 w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink hover:bg-bg-soft text-2xl leading-none cursor-pointer"
              aria-label="Đóng"
            >
              ×
            </button>
            <h3 className="text-2xl font-extrabold tracking-tight">
              {reg ? "Tạo tài khoản" : "Đăng nhập"}
            </h3>
            <p className="text-ink-2 text-sm mt-1 mb-6">
              {reg ? "Miễn phí, chỉ mất 30 giây" : "Chào mừng trở lại"}
            </p>

            <form action={action} onSubmit={() => { try { sessionStorage.setItem("vie:auth", reg ? "sign_up" : "login"); } catch {} }}>
              <input type="hidden" name="mode" value={reg ? "register" : "login"} />
              {reg && (
                <>
                  <label className="block text-xs font-semibold mt-4 mb-1.5">Họ và tên</label>
                  <input name="full_name" className="auth-input" placeholder="Nguyễn Văn A" />
                </>
              )}
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
              <b
                className="text-accent cursor-pointer"
                onClick={() => setMode(reg ? "login" : "register")}
              >
                {reg ? "Đăng nhập" : "Tạo ngay"}
              </b>
            </p>
            <div className="mt-5 rounded-[10px] bg-bg-soft border border-border p-3 text-xs text-ink-2 text-center">
              Bạn chỉ cần đăng nhập khi <b>mua hoặc học</b> khóa học. Xem nội dung &amp; lướt cộng đồng không cần tài khoản.
            </div>
          </div>
        </div>
      )}
    </AuthCtx.Provider>
  );
}
