"use client";
import { useEffect } from "react";

// Lưu mã giới thiệu (?ref=<id>) vào cookie 30 ngày để quy công khi đăng ký.
export default function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[0-9a-f-]{36}$/i.test(ref)) {
        document.cookie = `vie_ref=${ref}; max-age=${60 * 60 * 24 * 30}; path=/; samesite=lax`;
      }
    } catch {}
  }, []);
  return null;
}
