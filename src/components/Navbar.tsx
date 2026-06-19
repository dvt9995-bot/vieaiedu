"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import NotificationBell from "./NotificationBell";

const links = [
  { href: "/courses", label: "Khóa học" },
  { href: "/community", label: "Cộng đồng" },
  { href: "/blog", label: "Blog" },
  { href: "/wishlist", label: "Yêu thích" },
  { href: "/dashboard", label: "Học của tôi" },
];

export default function Navbar() {
  const { open } = useAuthModal();
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const supabase = createClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
      return () => { window.removeEventListener("scroll", onScroll); sub.subscription.unsubscribe(); };
    }
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-[120] backdrop-blur-md bg-[rgba(255,255,255,.8)] transition-shadow ${
        solid ? "border-b border-border shadow-soft" : "border-b border-transparent"
      }`}
    >
      <nav className="container-x flex items-center justify-between h-16">
        <Link href="/" className="flex items-center" aria-label="VIE AI EDU">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VIE AI EDU" className="h-11 w-auto" />
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-2 hover:text-ink transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {email ? (
            <>
              <NotificationBell />
              <Link href="/dashboard" className="hidden sm:flex items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink px-2 py-1">
                <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold uppercase">{email[0]}</span>
                <span className="max-w-[140px] truncate">{email}</span>
              </Link>
              <form action={signOut}>
                <button className="hidden sm:inline-flex text-sm font-semibold text-ink-2 hover:text-accent px-3 py-2 cursor-pointer">Đăng xuất</button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => open("login")} className="hidden sm:inline-flex text-sm font-semibold text-ink-2 hover:text-ink px-4 py-2 cursor-pointer">
                Đăng nhập
              </button>
              <button onClick={() => open("register")} className="inline-flex text-sm font-semibold bg-accent hover:bg-accent-700 text-white px-4 py-2 rounded-full cursor-pointer transition-colors">
                Bắt đầu
              </button>
            </>
          )}
          <button className="md:hidden p-2 cursor-pointer" aria-label="menu" onClick={() => setMenu(!menu)}>
            <span className="block w-5 h-0.5 bg-ink mb-1" />
            <span className="block w-5 h-0.5 bg-ink mb-1" />
            <span className="block w-5 h-0.5 bg-ink" />
          </button>
        </div>
      </nav>

      {menu && (
        <div className="md:hidden border-t border-border bg-surface px-6 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className="py-2 text-ink-2 hover:text-ink font-medium">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
