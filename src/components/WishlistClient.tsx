"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CourseCard from "./CourseCard";
import { loadFavorites } from "@/lib/db";
import type { Course } from "@/lib/types";

export default function WishlistClient() {
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    (async () => {
      const [all, favs] = await Promise.all([
        fetch("/api/courses").then((r) => r.json()).then((d) => d.courses as Course[]).catch(() => []),
        loadFavorites(),
      ]);
      setCourses(all.filter((c) => favs.includes(c.slug)));
    })();
  }, []);

  if (courses === null) return <p className="text-ink-3">Đang tải…</p>;
  if (courses.length === 0)
    return (
      <div className="text-center py-16">
        <p className="text-ink-2 mb-4">Bạn chưa lưu khóa nào. Nhấn ★ trên khóa học để lưu.</p>
        <Link href="/courses" className="inline-flex rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-3 transition-colors">Khám phá khóa học</Link>
      </div>
    );
  return (
    <div className="grid gap-[22px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => <CourseCard key={c.id} course={c} />)}
    </div>
  );
}
