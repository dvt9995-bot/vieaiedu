"use client";
import { useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import FilterMenu from "./FilterMenu";
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

  return (
    <div>
      {/* Thanh công cụ: tìm kiếm + nút phễu lọc */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="relative flex-1 min-w-0">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] stroke-ink-3 fill-none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm khóa học…"
            className="w-full pl-10 pr-4 py-2 rounded-full border border-border-strong bg-surface text-sm outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-weak)] transition"
          />
        </div>
        <FilterMenu
          align="right"
          groups={[
            { key: "cat", label: "Danh mục", value: cat, onChange: setCat, options: cats.map((c) => ({ value: c, label: c === "all" ? "Tất cả" : c })) },
            { key: "level", label: "Cấp độ", value: level, onChange: setLevel, options: [{ value: "all", label: "Mọi cấp độ" }, { value: "beginner", label: LEVEL_LABEL.beginner }, { value: "intermediate", label: LEVEL_LABEL.intermediate }, { value: "advanced", label: LEVEL_LABEL.advanced }] },
            { key: "price", label: "Mức giá", value: price, onChange: setPrice, options: [{ value: "all", label: "Tất cả giá" }, { value: "free", label: "Miễn phí" }, { value: "paid", label: "Trả phí" }] },
            { key: "sort", label: "Sắp xếp", value: sort, onChange: setSort, options: [{ value: "popular", label: "Phổ biến" }, { value: "rating", label: "Đánh giá cao" }, { value: "price-asc", label: "Giá thấp → cao" }, { value: "price-desc", label: "Giá cao → thấp" }] },
          ]}
        />
      </div>

      <p className="text-ink-3 text-sm mb-5">{filtered.length} khóa học</p>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ink-3">Không tìm thấy khóa học phù hợp.</div>
      ) : (
        <div className="grid gap-3 sm:gap-[22px] grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  );
}
