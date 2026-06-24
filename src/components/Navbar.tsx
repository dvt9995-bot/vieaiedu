"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import NotificationBell from "./NotificationBell";
import Avatar from "./Avatar";
import { track } from "@/lib/analytics";

// Điều hướng công khai (hướng cộng đồng), gọn gàng
const links = [
  { href: "/courses", label: "Khóa học" },
  { href: "/live", label: "Lớp trực tiếp" },
  { href: "/shop", label: "Shop" },
  { href: "/blog", label: "Tin tức" },
  { href: "/community", label: "Cộng đồng" },
];
// Mục cá nhân — gom vào menu avatar
const userLinks = [
  { href: "/dashboard", label: "Học của tôi" },
  { href: "/orders", label: "Lịch sử mua hàng" },
  { href: "/teach", label: "Khu giảng viên" },
  { href: "/seller", label: "Kênh người bán" },
  { href: "/wallet", label: "Ví & Kiếm tiền" },
  { href: "/wishlist", label: "Yêu thích" },
  { href: "/account", label: "Cài đặt tài khoản" },
];

export default function Navbar() {
  const { open } = useAuthModal();
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const ddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const onClick = (e: MouseEvent) => { if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDropdown(false); };
    document.addEventListener("click", onClick);
    const supabase = createClient();
    const loadAvatar = (id?: string) => { if (id && supabase) supabase.from("profiles").select("avatar_url").eq("id", id).maybeSingle().then(({ data }) => setAvatar((data?.avatar_url as string) || null)); };
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => { setEmail(data.user?.email ?? null); loadAvatar(data.user?.id); });
      const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
        setEmail(s?.user?.email ?? null);
        if (s?.user?.id) loadAvatar(s.user.id); else setAvatar(null);
        if (e === "SIGNED_IN") {
          let intent: string | null = null;
          try { intent = sessionStorage.getItem("vie:auth"); sessionStorage.removeItem("vie:auth"); } catch {}
          if (intent) track(intent === "sign_up" ? "sign_up" : "login");
        }
      });
      return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("click", onClick); sub.subscription.unsubscribe(); };
    }
    return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("click", onClick); };
  }, []);

  return (
    <header className={`fixed top-0 inset-x-0 z-[120] backdrop-blur-md bg-[rgba(255,255,255,.82)] transition-shadow ${solid ? "border-b border-border shadow-soft" : "border-b border-transparent"}`}>
      <nav className="container-x flex items-center justify-between h-16 gap-4">
        <Link href="/" className="flex items-center shrink-0" aria-label="VIE AI EDU">
          <Image src="/logo.png" alt="VIE AI EDU" width={132} height={44} priority className="h-10 w-auto" />
        </Link>

        {/* Điều hướng giữa */}
        <div className="hidden md:flex gap-1 items-center mx-auto">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-soft rounded-full px-4 py-2 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/search" aria-label="Tìm kiếm" className="p-2 rounded-full text-ink-2 hover:text-accent hover:bg-bg-soft transition-colors">
            <svg className="w-[18px] h-[18px] stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          </Link>
          {email ? (
            <>
              <NotificationBell />
              <div className="relative hidden sm:block" ref={ddRef}>
                <button onClick={() => setDropdown((d) => !d)} className="flex items-center gap-2 rounded-full hover:bg-bg-soft pl-1 pr-2.5 py-1 cursor-pointer transition-colors">
                  <Avatar src={avatar} name={email} size={32} />
                  <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-none stroke-ink-3 transition-transform ${dropdown ? "rotate-180" : ""}`} strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {dropdown && (
                  <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-xs text-ink-3">Đăng nhập với</div>
                      <div className="text-sm font-semibold truncate">{email}</div>
                    </div>
                    {userLinks.map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => setDropdown(false)} className="block px-4 py-2.5 text-sm font-medium text-ink-2 hover:bg-bg-soft hover:text-ink">{l.label}</Link>
                    ))}
                    <form action={signOut} className="border-t border-border">
                      <button className="w-full text-left px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent-weak cursor-pointer">Đăng xuất</button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => open("login")} className="hidden sm:inline-flex text-sm font-semibold text-ink-2 hover:text-ink px-4 py-2 cursor-pointer">Đăng nhập</button>
              <button onClick={() => open("register")} className="inline-flex text-sm font-semibold bg-accent hover:bg-accent-700 text-white px-4 py-2 rounded-full cursor-pointer transition-colors">Bắt đầu</button>
            </>
          )}
          <button className="md:hidden inline-flex flex-col items-center justify-center w-11 h-11 -mr-1.5 cursor-pointer" aria-label="Mở menu" onClick={() => setMenu(!menu)}>
            <span className="block w-5 h-0.5 bg-ink mb-1" />
            <span className="block w-5 h-0.5 bg-ink mb-1" />
            <span className="block w-5 h-0.5 bg-ink" />
          </button>
        </div>
      </nav>

      {menu && (
        <div className="md:hidden border-t border-border bg-surface px-6 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className="py-2 text-ink-2 hover:text-ink font-medium">{l.label}</Link>
          ))}
          {email && <>
            <div className="h-px bg-border my-1" />
            {userLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className="py-2 text-ink-2 hover:text-ink font-medium">{l.label}</Link>
            ))}
            <form action={signOut}><button className="py-2 text-accent font-semibold cursor-pointer">Đăng xuất</button></form>
          </>}
        </div>
      )}
    </header>
  );
}
