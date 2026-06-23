import { NextResponse } from "next/server";
import { requireInstructor, ownsCourse } from "@/lib/instructor-guard";
import { createBunnyVideo, bunnyUploadAuth, isBunnyUploadConfigured } from "@/lib/bunny";

// Tạo video-object trên Bunny + ký phiên TUS để trình duyệt upload thẳng (không qua server mình).
export async function POST(req: Request) {
  const u = await requireInstructor();
  if (!u) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await isBunnyUploadConfigured())) return NextResponse.json({ error: "Hệ thống lưu trữ video (Bunny) chưa được cấu hình. Liên hệ quản trị viên." }, { status: 400 });
  const { courseId, title } = await req.json();
  if (!courseId || !(await ownsCourse(courseId, u))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const v = await createBunnyVideo(title || "Bài học");
  if (!v) return NextResponse.json({ error: "Không tạo được video trên Bunny" }, { status: 502 });
  const auth = await bunnyUploadAuth(v.videoId);
  if (!auth) return NextResponse.json({ error: "Không ký được phiên upload" }, { status: 500 });
  return NextResponse.json(auth);
}
