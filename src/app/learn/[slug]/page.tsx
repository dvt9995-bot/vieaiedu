import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/courses";
import { isEnrolled } from "@/lib/enroll";
import LearnClient from "@/components/LearnClient";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { slug } = await params;
  const { lesson } = await searchParams;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  // Khóa bài non-preview nếu khóa trả phí và user chưa ghi danh.
  const enrolled = course.price === 0 ? true : await isEnrolled(slug);
  return <LearnClient course={course} initialLesson={lesson} locked={!enrolled} />;
}
