import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Montserrat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";
import AuthModalProvider from "@/components/AuthModal";
import MobileTabBar from "@/components/MobileTabBar";
import PWARegister from "@/components/PWARegister";
import RefCapture from "@/components/RefCapture";
import Toaster from "@/components/Toaster";
import Tracking from "@/components/Tracking";
import AnalyticsBeacon from "@/components/AnalyticsBeacon";
import { Analytics } from "@vercel/analytics/react";
import { getConfig } from "@/lib/settings";

// Bộ nhận diện VIE AI EDU: tiêu đề Be Vietnam Pro, nội dung Montserrat
const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const [t, d, og] = await Promise.all([
    getConfig("seo_title"), getConfig("seo_description"), getConfig("seo_og_image"),
  ]);
  const title = t || "VIE AI EDU — Nền tảng học AI thực chiến";
  const description = d || "Khóa học AI thực chiến, dự án thực hành và cộng đồng học viên năng động. Học mọi lúc trên web và điện thoại.";
  const image = og || "/og.png";
  return {
    metadataBase: new URL("https://vieaiedu.vn"),
    title: { default: title, template: "%s · VIE AI EDU" },
    description,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "VIE AI EDU", statusBarStyle: "default" },
    openGraph: { title, description, type: "website", locale: "vi_VN", images: [{ url: image, width: 1200, height: 630, alt: "VIE AI EDU" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${montserrat.variable}`}>
      <body className="antialiased">
        <AuthModalProvider>
          <PromoBanner />
          <Navbar />
          <main className="pt-16">{children}</main>
          <Footer />
          {/* Chừa chỗ cho thanh tab dưới trên mobile */}
          <div className="h-14 md:hidden" aria-hidden style={{ marginBottom: "env(safe-area-inset-bottom)" }} />
          <MobileTabBar />
        </AuthModalProvider>
        <PWARegister />
        <RefCapture />
        <Toaster />
        <Analytics />
        <Tracking />
        <AnalyticsBeacon />
      </body>
    </html>
  );
}
