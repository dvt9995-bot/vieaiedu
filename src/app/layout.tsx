import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Montserrat } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthModalProvider from "@/components/AuthModal";
import PWARegister from "@/components/PWARegister";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://vieaiedu.vn"),
  title: { default: "VIE AI EDU — Nền tảng học AI thực chiến", template: "%s · VIE AI EDU" },
  description:
    "Khóa học AI thực chiến, dự án thực hành và cộng đồng học viên năng động. Học mọi lúc trên web và điện thoại.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "VIE AI EDU", statusBarStyle: "default" },
  openGraph: {
    title: "VIE AI EDU — Nền tảng học AI thực chiến",
    description: "Khóa học AI thực chiến, dự án thực hành và cộng đồng học viên.",
    type: "website",
    locale: "vi_VN",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "VIE AI EDU" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VIE AI EDU — Nền tảng học AI thực chiến",
    description: "Khóa học AI thực chiến, dự án thực hành và cộng đồng học viên.",
    images: ["/og.png"],
  },
};

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
          <Navbar />
          <main className="pt-16">{children}</main>
          <Footer />
        </AuthModalProvider>
        <PWARegister />
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
