"use client";
import { useAuthModal } from "./AuthModal";

export default function JoinButton({ label = "Tham gia miễn phí", className = "" }: { label?: string; className?: string }) {
  const { open } = useAuthModal();
  return (
    <button onClick={() => open("register")} className={className || "rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-base px-7 py-3 cursor-pointer transition-colors shadow-[0_8px_24px_rgba(228,30,38,.28)]"}>
      {label}
    </button>
  );
}
