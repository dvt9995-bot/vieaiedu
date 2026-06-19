"use client";
import Link from "next/link";
import { useState } from "react";
import type { Course } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { toggleFavorite } from "@/lib/db";

export default function CourseCard({ course }: { course: Course }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(course.likes);

  function onFav() {
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    toggleFavorite(course.slug, next);
  }

  return (
    <div className="group rounded-card border border-border bg-surface overflow-hidden transition-all hover:border-border-strong hover:shadow-lg hover:-translate-y-1">
      <Link href={`/courses/${course.slug}`} className="block">
        <div className="relative aspect-video bg-bg-soft border-b border-border flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={course.thumb} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur border border-border shadow-soft flex items-center justify-center z-10 transition-transform group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5 fill-accent"><path d="M8 5v14l11-7z" /></svg>
          </div>
          <span className="absolute top-3 left-3 bg-surface border border-border text-ink-2 font-semibold text-[.72rem] px-2.5 py-1 rounded-full z-10">
            {course.category}
          </span>
        </div>
      </Link>
      <div className="p-5">
        <Link href={`/courses/${course.slug}`}>
          <h3 className="text-[1.12rem] font-bold tracking-tight hover:text-accent transition-colors">{course.title}</h3>
        </Link>
        <div className="text-ink-3 text-sm mt-2 mb-4">
          {course.totalMinutes >= 60 ? `${Math.round(course.totalMinutes / 60)} giờ` : `${course.totalMinutes} phút`} · {course.lessonsCount} bài · ⭐ {course.rating}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2 font-extrabold text-[1.2rem] tracking-tight">
            {formatVND(course.price)}
            {course.comparePrice && <small className="text-ink-3 line-through font-medium text-[.82rem]">{formatVND(course.comparePrice)}</small>}
          </div>
          <Link href={`/courses/${course.slug}`} className="text-sm font-semibold bg-accent hover:bg-accent-700 text-white px-4 py-2 rounded-full transition-colors">
            {course.price === 0 ? "Học ngay" : "Chi tiết"}
          </Link>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-border">
          <button
            onClick={onFav}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer ${liked ? "text-accent" : "text-ink-3 hover:text-ink-2"}`}
          >
            <svg viewBox="0 0 24 24" className={`w-[18px] h-[18px] transition-transform ${liked ? "fill-accent stroke-accent scale-110" : "fill-none stroke-ink-3"}`} strokeWidth="1.7">
              <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" />
            </svg>
            {likes.toLocaleString("vi-VN")}
          </button>
          <span className="text-ink-3 text-[.82rem]">Truy cập trọn đời</span>
        </div>
      </div>
    </div>
  );
}
