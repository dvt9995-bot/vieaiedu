import { NextResponse } from "next/server";
import { getCourses } from "@/lib/courses";

// Danh sách khóa công khai cho client (wishlist, dashboard).
export async function GET() {
  const courses = await getCourses();
  return NextResponse.json({ courses });
}
