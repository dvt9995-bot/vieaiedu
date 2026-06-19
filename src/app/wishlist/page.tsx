import type { Metadata } from "next";
import WishlistClient from "@/components/WishlistClient";
export const metadata: Metadata = { title: "Khóa học yêu thích" };
export default function WishlistPage() {
  return (
    <div className="container-x py-12">
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-2">Khóa học yêu thích</h1>
      <p className="text-ink-2 text-lg mb-8">Những khóa bạn đã lưu bằng nút ★.</p>
      <WishlistClient />
    </div>
  );
}
