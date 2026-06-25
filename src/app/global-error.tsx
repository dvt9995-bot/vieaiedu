"use client";
import { useEffect } from "react";

// Bắt lỗi nghiêm trọng toàn ứng dụng → báo admin + hiện màn hình thân thiện.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `${error?.message || "Unknown"}${error?.digest ? ` (${error.digest})` : ""}`, url: typeof window !== "undefined" ? window.location.pathname : "", ua: typeof navigator !== "undefined" ? navigator.userAgent : "" }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, background: "#f5f6f8", color: "#202124" }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "12px 0 6px" }}>Đã có lỗi xảy ra</h1>
          <p style={{ color: "#565b66", marginBottom: 20 }}>Xin lỗi vì sự bất tiện. Đội ngũ đã được thông báo. Vui lòng thử lại.</p>
          <button onClick={reset} style={{ background: "#e41e26", color: "#fff", border: 0, borderRadius: 999, padding: "10px 22px", fontWeight: 700, cursor: "pointer" }}>Thử lại</button>
          <a href="/" style={{ display: "block", marginTop: 14, color: "#565b66", fontSize: 14 }}>← Về trang chủ</a>
        </div>
      </body>
    </html>
  );
}
