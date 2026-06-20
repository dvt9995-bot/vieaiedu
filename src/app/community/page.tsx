import type { Metadata } from "next";
import CommunityFeed from "@/components/CommunityFeed";

export const metadata: Metadata = {
  title: "Cộng đồng",
  description: "Cộng đồng học viên AI: đăng bài, hỏi đáp, chia sẻ dự án.",
  alternates: { canonical: "/community" },
  openGraph: { title: "Cộng đồng AI người Việt · VIE AI EDU", description: "Tham gia cộng đồng học viên AI: đặt câu hỏi, chia sẻ dự án và kết nối.", type: "website" },
};

export default function CommunityPage() {
  return (
    <div className="container-x py-12">
      <div className="text-center mb-10">
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight">Cộng đồng</h1>
        <p className="text-ink-2 text-lg mt-2 max-w-[60ch] mx-auto">Đăng bài, hỏi đáp, chia sẻ dự án và kết nối với những người học AI khác.</p>
      </div>
      <CommunityFeed />
    </div>
  );
}
