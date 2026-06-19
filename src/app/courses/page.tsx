import type { Metadata } from "next";
import CoursesBrowser from "@/components/CoursesBrowser";
import { COURSES } from "@/lib/mock";

export const metadata: Metadata = {
  title: "Khóa học AI",
  description: "Danh sách khóa học AI: nhập môn, prompt engineering, chatbot, dữ liệu, sáng tạo.",
};

export default function CoursesPage() {
  return (
    <div className="container-x py-12">
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-2">Khóa học</h1>
      <p className="text-ink-2 text-lg mb-8 max-w-[60ch]">
        Học AI từ cơ bản tới nâng cao. Mua riêng từng khóa, truy cập trọn đời.
      </p>
      <CoursesBrowser courses={COURSES} />
    </div>
  );
}
