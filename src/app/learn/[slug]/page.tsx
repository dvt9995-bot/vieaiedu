import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/courses";
import { isEnrolled } from "@/lib/enroll";
import { bunnyEmbedUrl, isBunnyConfigured } from "@/lib/bunny";
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

  // URL nhúng video Bunny (server-side, kèm token nếu bật) cho từng bài có video_id.
  const videoUrls: Record<string, string> = {};
  if (await isBunnyConfigured()) {
    for (const s of course.sections)
      for (const l of s.lessons)
        if (l.videoId) videoUrls[l.id] = await bunnyEmbedUrl(l.videoId);
  }

  return <LearnClient course={course} initialLesson={lesson} locked={!enrolled} videoUrls={videoUrls} />;
}
