import Link from "next/link";
import CertPrintButton from "@/components/CertPrintButton";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCourseBySlug } from "@/lib/courses";
import type { Metadata } from "next";
import { formatDate } from "@/lib/format";
import { getConfig } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Chứng chỉ hoàn thành",
  description: "Xác thực chứng chỉ hoàn thành khóa học AI tại VIE AI EDU.",
};

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [signer, signerTitle] = await Promise.all([getConfig("cert_signer"), getConfig("cert_signer_title")]);
  const SIGNER = signer || "Long Nam";
  const SIGNER_TITLE = signerTitle || "Giám đốc đào tạo";
  let cert = { name: "Nguyễn Văn Minh", course: "ỨNG DỤNG AI TRONG CÔNG VIỆC", date: "19/06/2026", code, signer: SIGNER, studentCode: "VIE26000000", avatar: "" };
  let verified = false;

  // Tra chứng chỉ thật theo mã
  if (isSupabaseConfigured() && code !== "VIEAIEDU-DEMO") {
    const supabase = await createClient();
    const { data } = await supabase!.from("certificates").select("user_id, course_slug, issued_at").eq("code", code).maybeSingle();
    if (data) {
      verified = true;
      const [{ data: prof }, course] = await Promise.all([
        supabase!.from("profiles").select("full_name, student_code, avatar_url").eq("id", data.user_id).maybeSingle(),
        getCourseBySlug(data.course_slug as string),
      ]);
      cert = {
        name: (prof?.full_name as string) || "Học viên",
        course: (course?.title || data.course_slug as string).toUpperCase(),
        date: formatDate(data.issued_at as string),
        code, signer: "Long Nam",
        studentCode: (prof?.student_code as string) || "—",
        avatar: (prof?.avatar_url as string) || "",
      };
    }
  }

  const certUrl = `https://vieaiedu.vn/certificate/${cert.code}`;

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
            <div className="mx-auto mt-3 mb-6 h-0.5 w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />

            {cert.avatar && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={cert.avatar} alt={cert.name} className="w-24 h-24 rounded-full object-cover mx-auto mb-5 ring-4 ring-gold/40 shadow-md" />
            )}

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
                <div className="font-semibold text-ink border-t border-ink-3/40 pt-1.5 inline-block mt-1">{SIGNER_TITLE}</div>
              </div>
            </div>

            <div className="mt-8 text-ink-3 text-xs">Mã học viên: <span className="font-mono text-ink-2">{cert.studentCode}</span> · Mã xác thực: <span className="font-mono text-ink-2">{cert.code}</span></div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mt-6 no-print">
        <CertPrintButton />
        <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(cert.course)}&organizationName=${encodeURIComponent("VIE AI EDU")}&certUrl=${encodeURIComponent(certUrl)}&certId=${encodeURIComponent(cert.code)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-[#0a66c2] text-white font-semibold px-5 py-3">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 17V9.93H6V17h2.34zM7.17 8.9a1.36 1.36 0 100-2.71 1.36 1.36 0 000 2.71zM18 17v-3.87c0-2.07-1.1-3.03-2.58-3.03-1.19 0-1.72.66-2.02 1.12V9.93H11.1V17h2.3v-3.95c0-.21.02-.42.08-.57.17-.42.55-.85 1.2-.85.84 0 1.18.64 1.18 1.58V17H18z"/></svg>
          Thêm vào hồ sơ LinkedIn
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(certUrl)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-[#1877f2] text-white font-semibold px-5 py-3">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden><path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/></svg>
          Chia sẻ Facebook
        </a>
        <Link href="/courses" className="rounded-full border border-border-strong hover:border-accent hover:text-accent font-semibold px-6 py-3 transition-colors">Khóa học khác</Link>
      </div>
      <p className="text-center text-ink-3 text-sm mt-6">
        {verified
          ? <span className="inline-flex items-center gap-1.5 text-success font-semibold">✓ Chứng chỉ đã được xác thực</span>
          : "Chứng chỉ mẫu"} · Xác thực công khai tại <span className="font-mono">vieaiedu.vn/certificate/{cert.code}</span>
      </p>
    </div>
  );
}
