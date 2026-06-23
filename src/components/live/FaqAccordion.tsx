"use client";
import { useState } from "react";
import type { Faq } from "@/lib/live";

// Hỏi - đáp gập/mở để xử lý phản đối trước khi mua.
export default function FaqAccordion({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2.5">
      {items.map((f, i) => (
        <div key={i} className="rounded-card border border-border bg-surface overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 cursor-pointer">
            <span className="font-semibold text-sm">{f.q}</span>
            <span className={`shrink-0 text-ink-3 transition-transform ${open === i ? "rotate-45" : ""}`}>＋</span>
          </button>
          {open === i && <div className="px-4 pb-4 -mt-1 text-sm text-ink-2 leading-relaxed">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}
