import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Tối ưu ảnh nội bộ (/public) + Supabase Storage. Ảnh tin tức domain lạ vẫn dùng <img>.
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
