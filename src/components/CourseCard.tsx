"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Course } from "@/lib/types";
import { formatVND } from "@/lib/format";
import { toggleFavorite, favoritesCached, invalidateFavorites } from "@/lib/db";
import { toast } from "./Toaster";
import { track } from "@/lib/analytics";

export default function CourseCard({ course }: { course: Course }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(course.likes);

  // Tải trạng thái yêu thích đã lưu (DB nếu đăng nhập, localStorage nếu chưa)
  useEffect(() => { favoritesCached().then((favs) => setLiked(favs.includes(course.slug))); }, [course.slug]);

  async function onFav() {
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    await toggleFavorite(course.slug, next);
    invalidateFavorites();
    if (next) track("add_to_wishlist", { item_id: course.slug, item_name: course.title });
    toast(next ? "Đã lưu vào yêu thích" : "Đã bỏ khỏi yêu thích");
  }

  return (
    <div className="group rounded-card border border-border bg-surface overflow-hidden transition-all hover:border-border-strong hover:shadow-lg hover:-translate-y-1 h-full flex flex-col">
      <Link href={`/courses/${course.slug}`} className="block">
        <div className="relative aspect-video bg-bg-soft border-b border-border flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={course.thumb} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-surface border border-border text-ink-2 font-semibold text-[.66rem] sm:text-[.72rem] px-2 py-0.5 sm:py-1 rounded-full z-10 max-w-[80%] truncate">
            {course.category}
          </span>
        </div>
      </Link>
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
        <Link href={`/courses/${course.slug}`}>
          <h3 className="text-[.92rem] sm:text-[1.12rem] font-bold tracking-tight leading-snug line-clamp-2 hover:text-accent transition-colors">{course.title}</h3>
        </Link>
        <div className="text-ink-3 text-xs sm:text-sm mt-1.5 sm:mt-2 mb-3 sm:mb-4 line-clamp-1">
          {course.totalMinutes >= 60 ? `${Math.round(course.totalMinutes / 60)} giờ` : `${course.totalMinutes} phút`} · {course.lessonsCount} bài · ⭐ {course.rating}
        </div>
        <div className="flex items-baseline gap-2 font-extrabold text-[1.05rem] sm:text-[1.2rem] tracking-tight mt-auto">
          {formatVND(course.price)}
          {course.comparePrice && <small className="text-ink-3 line-through font-medium text-[.78rem] sm:text-[.82rem]">{formatVND(course.comparePrice)}</small>}
        </div>
        <Link href={`/courses/${course.slug}`} className="block text-center mt-3 text-sm font-semibold bg-accent hover:bg-accent-700 text-white px-4 py-2.5 rounded-full transition-colors">
          {course.price === 0 ? "Học ngay" : "Xem chi tiết"}
        </Link>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <button
            onClick={onFav}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors cursor-pointer py-1 ${liked ? "text-accent" : "text-ink-3 hover:text-ink-2"}`}
          >
            <svg viewBox="0 0 24 24" className={`w-[18px] h-[18px] transition-transform ${liked ? "fill-accent stroke-accent scale-110" : "fill-none stroke-ink-3"}`} strokeWidth="1.7">
              <path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" />
            </svg>
            {likes.toLocaleString("vi-VN")}
          </button>
          <span className="text-ink-3 text-[.82rem] hidden sm:inline">Truy cập trọn đời</span>
        </div>
      </div>
    </div>
  );
}
