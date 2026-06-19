"use client";
import { useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import type { Course } from "@/lib/types";
import { LEVEL_LABEL } from "@/lib/types";

export default function CoursesBrowser({ courses }: { courses: Course[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState("all");
  const [price, setPrice] = useState("all");

  const cats = useMemo(() => ["all", ...Array.from(new Set(courses.map((c) => c.category)))], [courses]);

  const filtered = useMemo(
    () =>
      courses.filter((c) => {
        if (q && !`${c.title} ${c.subtitle}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (cat !== "all" && c.category !== cat) return false;
        if (level !== "all" && c.level !== level) return false;
        if (price === "free" && c.price !== 0) return false;
        if (price === "paid" && c.price === 0) return false;
        return true;
      }),
    [courses, q, cat, level, price]
  );

  const selectCls =
    "appearance-none cursor-pointer rounded-xl border border-border-strong bg-surface pl-3.5 pr-9 py-2.5 text-sm font-medium text-ink outline-none focus:border-accent transition-colors bg-[length:16px] bg-no-repeat bg-[right_0.7rem_center]";
  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a909c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

  return (
    <div>
      {/* Thanh công cụ: tìm kiếm + dropdown gọn */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 stroke-ink-3 fill-none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm khóa học (vd: prompt, chatbot, dữ liệu...)"
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-border-strong bg-surface outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-weak)] transition"
          />
        </div>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={selectCls} style={{ backgroundImage: chevron }} aria-label="Cấp độ">
          <option value="all">Mọi cấp độ</option>
          <option value="beginner">{LEVEL_LABEL.beginner}</option>
          <option value="intermediate">{LEVEL_LABEL.intermediate}</option>
          <option value="advanced">{LEVEL_LABEL.advanced}</option>
        </select>
        <select value={price} onChange={(e) => setPrice(e.target.value)} className={selectCls} style={{ backgroundImage: chevron }} aria-label="Mức giá">
          <option value="all">Tất cả giá</option>
          <option value="free">Miễn phí</option>
          <option value="paid">Trả phí</option>
        </select>
      </div>

      {/* Chủ đề: tab gạch chân, một hàng (cuộn ngang trên mobile) */}
      <div className="flex gap-6 border-b border-border mb-6 overflow-x-auto -mx-1 px-1">
        {cats.map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`relative whitespace-nowrap pb-3 pt-1 text-sm font-semibold transition-colors cursor-pointer ${active ? "text-accent" : "text-ink-2 hover:text-ink"}`}
            >
              {c === "all" ? "Tất cả" : c}
              {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full" />}
            </button>
          );
        })}
      </div>

      <p className="text-ink-3 text-sm mb-5">{filtered.length} khóa học</p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ink-3">Không tìm thấy khóa học phù hợp.</div>
      ) : (
        <div className="grid gap-[22px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  );
}
