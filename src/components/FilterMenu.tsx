"use client";
import { useEffect, useRef, useState } from "react";

export interface ChipOption { value: string; label: string }
export interface FilterGroup {
  key: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ChipOption[];
}

// Bộ lọc dạng phễu: nút mở panel, tích chọn từng nhóm. Dùng chung toàn hệ thống.
export default function FilterMenu({ groups, align = "left" }: { groups: FilterGroup[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onEsc); };
  }, []);

  // Số nhóm đang khác mặc định (option đầu tiên)
  const activeCount = groups.filter((g) => g.value !== g.options[0]?.value).length;
  const reset = () => groups.forEach((g) => g.onChange(g.options[0]?.value));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer transition-colors ${activeCount || open ? "border-accent text-accent bg-accent-weak" : "border-border-strong text-ink-2 hover:border-accent hover:text-accent"}`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
        Bộ lọc
        {activeCount > 0 && <span className="ml-0.5 min-w-5 h-5 px-1.5 rounded-full bg-accent text-white text-xs grid place-items-center">{activeCount}</span>}
      </button>

      {open && (
        <div className={`absolute z-50 mt-2 w-64 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface shadow-lg p-3 ${align === "right" ? "right-0" : "left-0"}`}>
          {groups.map((g) => (
            <div key={g.key} className="mb-3 last:mb-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3 px-1 mb-1">{g.label}</div>
              <div className="flex flex-col">
                {g.options.map((o) => {
                  const sel = g.value === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => g.onChange(o.value)}
                      className={`flex items-center justify-between text-left text-sm rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${sel ? "bg-accent-weak text-accent font-semibold" : "text-ink-2 hover:bg-bg-soft"}`}
                    >
                      <span>{o.label}</span>
                      {sel && <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-accent" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
            <button onClick={reset} className="text-sm text-ink-3 hover:text-accent cursor-pointer">Đặt lại</button>
            <button onClick={() => setOpen(false)} className="text-sm font-semibold text-accent cursor-pointer">Xong</button>
          </div>
        </div>
      )}
    </div>
  );
}
