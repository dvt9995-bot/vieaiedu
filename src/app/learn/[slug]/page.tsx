import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/courses";
import { isEnrolled } from "@/lib/enroll";
import { bunnyEmbedUrl, isBunnyConfigured } from "@/lib/bunny";
import { parseVideoRef } from "@/lib/video";
import LearnClient, { type PlayerSrc } from "@/components/LearnClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Khu vực học", robots: { index: false, follow: false } };

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

  // Nguồn phát cho từng bài: YouTube (ẩn nguồn) hoặc Bunny (kèm token).
  const players: Record<string, PlayerSrc> = {};
  const bunnyOn = await isBunnyConfigured();
  for (const s of course.sections)
    for (const l of s.lessons) {
      const ref = parseVideoRef(l.videoId);
      if (!ref) continue;
      if (ref.kind === "youtube") players[l.id] = { kind: "youtube", src: ref.id };
      else if (bunnyOn) players[l.id] = { kind: "bunny", src: await bunnyEmbedUrl(ref.id) };
    }

  return <LearnClient course={course} initialLesson={lesson} locked={!enrolled} players={players} />;
}
