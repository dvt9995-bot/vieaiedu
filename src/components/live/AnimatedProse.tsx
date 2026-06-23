"use client";
import { useEffect, useRef } from "react";

// Hiển thị nội dung Markdown (đã sang HTML) với hiệu ứng động: từng phần fade/slide-up khi cuộn tới.
// Nhấn mạnh tiêu đề ## và danh sách → tăng tỉ lệ chuyển đổi, vẫn nhẹ (CSS + IntersectionObserver).
export default function AnimatedProse({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = Array.from(root.children) as HTMLElement[];
    els.forEach((el, i) => { el.classList.add("reveal-up"); el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [html]);
  return <div ref={ref} className="prose-course prose-animated text-ink-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}
