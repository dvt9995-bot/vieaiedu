import Link from "next/link";
import CertPrintButton from "@/components/CertPrintButton";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCourseBySlug } from "@/lib/courses";

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let cert = { name: "Nguyễn Văn Minh", course: "ỨNG DỤNG AI TRONG CÔNG VIỆC", date: "19/06/2026", code, signer: "Trần Minh Đức" };

  // Tra chứng chỉ thật theo mã
  if (isSupabaseConfigured() && code !== "VIEAIEDU-DEMO") {
    const supabase = await createClient();
    const { data } = await supabase!.from("certificates").select("user_id, course_slug, issued_at").eq("code", code).maybeSingle();
    if (data) {
      const [{ data: prof }, course] = await Promise.all([
        supabase!.from("profiles").select("full_name").eq("id", data.user_id).maybeSingle(),
        getCourseBySlug(data.course_slug as string),
      ]);
      cert = {
        name: (prof?.full_name as string) || "Học viên",
        course: (course?.title || data.course_slug as string).toUpperCase(),
        date: new Date(data.issued_at as string).toLocaleDateString("vi-VN"),
        code, signer: "Long Nam",
      };
    }
  }

  const Corner = ({ className }: { className: string }) => (
    <svg className={`absolute w-16 h-16 ${className}`} viewBox="0 0 64 64" aria-hidden>
      <path d="M2 38 Q2 2 38 2" fill="none" stroke="#f4b400" strokeWidth="2.5" />
      <path d="M10 30 Q10 10 30 10" fill="none" stroke="#e41e26" strokeWidth="2" />
      <circle cx="8" cy="8" r="3" fill="#f4b400" />
    </svg>
  );

  return (
    <div className="container-x py-16 max-w-[860px]">
      {/* Khung chứng chỉ: viền đỏ kép + góc hoa văn vàng */}
      <div className="relative bg-surface shadow-lg ring-1 ring-accent/20 p-2.5">
        <div className="relative border-[3px] border-accent p-1">
          <div className="relative border border-gold/60 px-6 sm:px-14 py-12 text-center overflow-hidden">
            {/* họa tiết trống đồng mờ */}
            <svg className="absolute -right-20 -top-20 w-[260px] opacity-[.05]" viewBox="0 0 200 200" aria-hidden><g fill="none" stroke="#e41e26" strokeWidth="1.5"><circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="30" /></g></svg>
            <Corner className="top-1.5 left-1.5" />
            <Corner className="top-1.5 right-1.5 rotate-90" />
            <Corner className="bottom-1.5 left-1.5 -rotate-90" />
            <Corner className="bottom-1.5 right-1.5 rotate-180" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="VIE AI EDU" className="h-16 w-auto mx-auto" />
            <h1 className="font-display text-[clamp(1.6rem,4vw,2.4rem)] font-extrabold tracking-[.05em] text-ink mt-6">CHỨNG NHẬN HOÀN THÀNH</h1>
            <div className="mx-auto mt-3 mb-7 h-0.5 w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

            <p className="text-ink-2">Chứng nhận</p>
            <div className="font-display text-[clamp(1.8rem,5vw,3rem)] italic font-bold text-accent my-2">{cert.name}</div>
            <p className="text-ink-2">đã hoàn thành xuất sắc khóa học</p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-accent mt-2 tracking-wide">{cert.course}</h2>

            <div className="flex items-end justify-between mt-12 gap-6 text-left">
              <div className="text-sm">
                <div className="font-semibold text-ink border-t border-ink-3/40 pt-1.5 inline-block">{cert.date}</div>
                <div className="text-ink-3 text-xs mt-0.5">Ngày cấp</div>
              </div>
              {/* con dấu / huy chương (ảnh render) */}
              <div className="relative -mt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cert-seal.png" alt="Con dấu chứng nhận" className="w-20 h-auto mx-auto drop-shadow-[0_8px_16px_rgba(228,30,38,.2)]" />
              </div>
              <div className="text-sm text-right">
                <div className="font-display italic text-lg text-ink">{cert.signer}</div>
                <div className="font-semibold text-ink border-t border-ink-3/40 pt-1.5 inline-block mt-1">Giám đốc đào tạo</div>
              </div>
            </div>

            <div className="mt-8 text-ink-3 text-xs">Mã xác thực: <span className="font-mono text-ink-2">{cert.code}</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 mt-6 no-print">
        <CertPrintButton />
        <Link href="/courses" className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold px-6 py-3 transition-colors">Khóa học khác</Link>
      </div>
      <p className="text-center text-ink-3 text-sm mt-6">Xác thực công khai tại vieaiedu.vn/certificate/{cert.code}</p>
    </div>
  );
}
