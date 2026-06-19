"use client";
import Link from "next/link";
import { useAuthModal } from "./AuthModal";

export default function HeroActions() {
  const { open } = useAuthModal();
  return (
    <div className="flex gap-3 mt-9 flex-wrap">
      <Link href="/courses" className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-base px-7 py-3 transition-colors shadow-[0_8px_24px_rgba(228,30,38,.28)]">
        Khám phá khóa học
      </Link>
      <button onClick={() => open("register")} className="rounded-full border border-border-strong hover:border-accent hover:text-accent bg-surface font-semibold text-base px-7 py-3 cursor-pointer transition-colors">
        Tìm hiểu thêm
      </button>
    </div>
  );
}
