"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Bắn sự kiện GA4 "search" khi có từ khóa.
export default function SearchTracker({ q, results }: { q: string; results: number }) {
  useEffect(() => {
    if (q.trim()) track("search", { search_term: q, results });
  }, [q, results]);
  return null;
}
