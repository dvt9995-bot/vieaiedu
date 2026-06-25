import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    // Tối ưu ảnh nội bộ (/public) + Supabase Storage. Ảnh tin tức domain lạ vẫn dùng <img>.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async rewrites() {
    return [
      // Landing page tĩnh (chạy quảng cáo) — URL sạch không cần đuôi .html
      { source: "/lp/ai-reels-auto-income", destination: "/lp/ai-reels-auto-income.html" },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "magic-ai-ua",
  project: "javascript-nextjs-tt",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Token lấy từ SENTRY_AUTH_TOKEN (env). Không có token → bỏ qua upload, vẫn build.
});
