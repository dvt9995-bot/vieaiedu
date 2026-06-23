import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface SessionUser { uid: string; role: string }

/** User hiện tại + vai trò (student|instructor|admin). null nếu chưa đăng nhập. */
export async function currentUser(): Promise<SessionUser | null> {
  const s = await createClient();
  if (!s) return null;
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await (admin ?? s).from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { uid: user.id, role: (data?.role as string) || "student" };
}

/** Chỉ cho giảng viên đã duyệt (hoặc admin). null nếu không đủ quyền. */
export async function requireInstructor(): Promise<SessionUser | null> {
  const u = await currentUser();
  if (!u || (u.role !== "instructor" && u.role !== "admin")) return null;
  return u;
}

/** Khóa có thuộc về giảng viên này không (admin luôn true). */
export async function ownsCourse(courseId: string, u: SessionUser): Promise<boolean> {
  if (!courseId) return false;
  if (u.role === "admin") return true;
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("courses").select("owner_id").eq("id", courseId).maybeSingle();
  return !!data && data.owner_id === u.uid;
}
