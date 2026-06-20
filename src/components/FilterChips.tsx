"use client";

export interface ChipOption { value: string; label: string }

// Bộ lọc chip thống nhất: gọn, cuộn ngang, ẩn thanh cuộn.
export default function FilterChips({ options, value, onChange, className = "" }: {
  options: ChipOption[]; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={`scroll-x flex gap-2 -mx-1 px-1 ${className}`}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`shrink-0 text-sm rounded-full px-3.5 py-1.5 border cursor-pointer transition-colors ${active ? "bg-accent text-white border-accent" : "bg-surface border-border-strong text-ink-2 hover:border-accent hover:text-accent"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
