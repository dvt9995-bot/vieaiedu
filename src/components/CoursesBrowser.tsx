"use client";
import { useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import FilterChips from "./FilterChips";
import type { Course } from "@/lib/types";
import { LEVEL_LABEL } from "@/lib/types";

export default function CoursesBrowser({ courses }: { courses: Course[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState("all");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("popular");

  const cats = useMemo(() => ["all", ...Array.from(new Set(courses.map((c) => c.category)))], [courses]);

  const filtered = useMemo(() => {
    const list = courses.filter((c) => {
      if (q && !`${c.title} ${c.subtitle}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat !== "all" && c.category !== cat) return false;
      if (level !== "all" && c.level !== level) return false;
      if (price === "free" && c.price !== 0) return false;
      if (price === "paid" && c.price === 0) return false;
      return true;
    });
    const cmp: Record<string, (a: Course, b: Course) => number> = {
      popular: (a, b) => b.students - a.students,
      rating: (a, b) => b.rating - a.rating,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
    };
    return [...list].sort(cmp[sort] ?? (() => 0));
  }, [courses, q, cat, level, price, sort]);

  const selectCls =
    "appearance-none cursor-pointer rounded-full border border-border-strong bg-surface pl-3.5 pr-8 py-2 text-sm font-medium text-ink-2 outline-none focus:border-accent transition-colors bg-[length:15px] bg-no-repeat bg-[right_0.6rem_center]";
  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a909c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

  return (
    <div>
      {/* Thanh công cụ: tìm kiếm + lọc gọn */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-ink-3 fill-none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm khóa học…"
            className="w-full pl-10 pr-4 py-2 rounded-full border border-border-strong bg-surface text-sm outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-weak)] transition"
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
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls} style={{ backgroundImage: chevron }} aria-label="Sắp xếp">
          <option value="popular">Phổ biến</option>
          <option value="rating">Đánh giá cao</option>
          <option value="price-asc">Giá ↑</option>
          <option value="price-desc">Giá ↓</option>
        </select>
      </div>

      {/* Chủ đề: chip cuộn ngang */}
      <FilterChips
        className="mb-5"
        value={cat}
        onChange={setCat}
        options={cats.map((c) => ({ value: c, label: c === "all" ? "Tất cả" : c }))}
      />

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
