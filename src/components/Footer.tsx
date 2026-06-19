import Link from "next/link";
import Newsletter from "./Newsletter";

const cols = [
  { h: "Sản phẩm", links: [["Khóa học", "/courses"], ["Cộng đồng", "/community"], ["Blog", "/blog"]] },
  { h: "Tài nguyên", links: [["Lộ trình học", "/blog/lo-trinh-hoc-ai-2026"], ["Hướng dẫn", "/blog"], ["Xác thực chứng chỉ", "/certificate/demo"]] },
  { h: "Hỗ trợ", links: [["Điều khoản", "/terms"], ["Bảo mật", "/privacy"], ["Liên hệ", "mailto:hello@vieaiedu.vn"]] },
];

export default function Footer() {
  return (
    <footer className="border-t border-border pt-14 pb-8 text-ink-2">
      <div className="container-x">
        <div className="grid gap-8 grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="VIE AI EDU" className="h-12 w-auto" />
            <p className="text-sm mt-2.5 max-w-[34ch]">
              Nền tảng học AI dành cho người Việt — khóa học, dự án và cộng đồng trong một nơi.
            </p>
            <p className="text-sm mt-2 font-semibold text-ink-2">Kiến tạo tri thức – Dẫn lối tương lai.</p>
            <div className="mt-5 max-w-[280px]"><Newsletter /></div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <h4 className="text-xs uppercase tracking-wider text-ink-3 mb-3.5 font-semibold">{c.h}</h4>
              {c.links.map(([label, href]) => (
                <Link key={label} href={href} className="block text-sm py-1 text-ink-2 hover:text-ink transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3 mt-10 pt-6 border-t border-border text-sm text-ink-3">
          <span>© 2026 VIE AI EDU · vieaiedu.vn</span>
          <span>Đăng nhập chỉ bắt buộc khi mua hoặc học khóa học.</span>
        </div>
      </div>
    </footer>
  );
}
