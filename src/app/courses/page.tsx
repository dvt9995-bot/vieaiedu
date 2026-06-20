import type { Metadata } from "next";
import CoursesBrowser from "@/components/CoursesBrowser";
import JsonLd from "@/components/JsonLd";
import { getCourses } from "@/lib/courses";

export const metadata: Metadata = {
  title: "Khóa học AI",
  description: "Danh sách khóa học AI: nhập môn, prompt engineering, chatbot, dữ liệu, sáng tạo.",
  alternates: { canonical: "/courses" },
};

export default async function CoursesPage() {
  const courses = await getCourses();
  const itemList = {
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: courses.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `https://vieaiedu.vn/courses/${c.slug}`, name: c.title })),
  };
  return (
    <div className="container-x py-12">
      <JsonLd data={itemList} />
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight mb-2">Khóa học</h1>
      <p className="text-ink-2 text-lg mb-8 max-w-[60ch]">
        Học AI từ cơ bản tới nâng cao. Mua riêng từng khóa, truy cập trọn đời.
      </p>
      <CoursesBrowser courses={courses} />
    </div>
  );
}
