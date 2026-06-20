"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Thanh điều hướng dưới cùng cho mobile (ẩn trên desktop). Chuẩn UX app: luôn nhìn thấy
// các mục chính, chạm 1 lần. Tự ẩn ở khu vực học (/learn) và admin để tối đa không gian.
const TABS = [
  { href: "/", label: "Trang chủ", icon: "M3 11.5 12 4l9 7.5M5 10v10h14V10" },
  { href: "/courses", label: "Khóa học", icon: "M4 5h16v12H4zM4 19h16" },
  { href: "/community", label: "Cộng đồng", icon: "M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-2.5 2.2-4 5-4s5 1.5 5 4m0 0c0-2.5 2.2-4 5-4s5 1.5 5 4" },
  { href: "/blog", label: "Tin tức", icon: "M5 4h11l3 3v13H5zM9 9h6M9 13h6M9 17h4" },
  { href: "/account", label: "Tài khoản", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.5-6 8-6s8 2 8 6" },
];

export default function MobileTabBar() {
  const path = usePathname() || "/";
  if (path.startsWith("/learn") || path.startsWith("/admin")) return null;
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-[120] bg-[rgba(255,255,255,.92)] backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Điều hướng chính"
    >
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = isActive(t.href);
          return (
            <Link key={t.href} href={t.href} className="flex flex-col items-center justify-center gap-0.5 h-14 active:bg-bg-soft transition-colors">
              <svg viewBox="0 0 24 24" className={`w-[22px] h-[22px] fill-none stroke-2 ${active ? "stroke-accent" : "stroke-ink-3"}`} strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              <span className={`text-[10px] font-semibold leading-none ${active ? "text-accent" : "text-ink-3"}`}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
