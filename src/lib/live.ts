import { createAdminClient } from "@/lib/supabase/admin";

export interface LiveSession { id: string; title: string | null; starts_at: string; duration_min: number; meet_url?: string | null; recording_url?: string | null; }
export interface Testimonial { name: string; avatar?: string; role?: string; content: string; rating: number; }
export interface Faq { q: string; a: string; }
export interface LiveCourse {
  id: string; slug: string; title: string; subtitle?: string; description?: string; thumb?: string;
  price: number; compare_price?: number; category?: string; level?: string; instructor?: string;
  instructorBio?: string; instructorAvatar?: string; guarantee?: string;
  capacity?: number | null; sessions: LiveSession[]; registered?: number;
  testimonials?: Testimonial[]; faq?: Faq[]; resultImages?: string[];
}

// FAQ mặc định (xử lý phản đối phổ biến) — dùng khi khóa chưa nhập FAQ riêng
export const DEFAULT_LIVE_FAQ: Faq[] = [
  { q: "Tôi mới bắt đầu, chưa có kinh nghiệm thì học được không?", a: "Được. Khóa thiết kế cho cả người mới — giảng viên hướng dẫn trực tiếp từng bước và bạn hỏi đáp ngay trong buổi học." },
  { q: "Lỡ không dự được buổi trực tiếp thì sao?", a: "Mỗi buổi đều có bản ghi hình để bạn xem lại bất cứ lúc nào trong tài khoản — không lo bỏ lỡ." },
  { q: "Học ở đâu, có cần cài phần mềm gì không?", a: "Học trực tiếp qua Google Meet ngay trên trình duyệt. Đến giờ bạn chỉ cần bấm “Vào lớp” trên website, không cần cài đặt phức tạp." },
  { q: "Thanh toán và xác nhận thế nào?", a: "Thanh toán an toàn qua chuyển khoản/QR SePay, hệ thống tự xác nhận sau vài giây và gửi bạn lịch học + nhắc giờ tự động." },
];

const JOIN_OPEN_BEFORE_MS = 15 * 60 * 1000;   // mở nút Vào lớp 15 phút trước giờ
const JOIN_GRACE_AFTER_MS = 30 * 60 * 1000;    // còn mở 30 phút sau khi hết giờ

function mapCourse(c: Record<string, unknown>, sessions: LiveSession[], registered?: number): LiveCourse {
  return {
    id: c.id as string, slug: c.slug as string, title: c.title as string, subtitle: (c.subtitle as string) || undefined,
    description: (c.description as string) || undefined, thumb: (c.thumb as string) || undefined,
    price: (c.price as number) || 0, compare_price: (c.compare_price as number) || undefined,
    category: (c.category as string) || undefined, level: (c.level as string) || undefined,
    instructor: (() => { const v = (c.instructor as string)?.trim(); return v && v !== "Long Nam" ? v : ""; })(),
    capacity: (c.capacity as number) ?? null, sessions, registered,
  };
}

// Danh sách khóa live đã duyệt (cho trang /live)
export async function getLiveCourses(): Promise<LiveCourse[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("courses").select("id, slug, title, subtitle, thumb, price, compare_price, category, level, instructor, capacity")
    .eq("status", "published").eq("review_status", "approved").eq("format", "live").order("created_at", { ascending: false });
  if (!data?.length) return [];
  const ids = data.map((c) => c.id);
  const { data: sess } = await admin.from("live_sessions").select("id, course_id, title, starts_at, duration_min").in("course_id", ids).order("starts_at");
  const byCourse = new Map<string, LiveSession[]>();
  (sess || []).forEach((s) => { const arr = byCourse.get(s.course_id as string) || []; arr.push(s as unknown as LiveSession); byCourse.set(s.course_id as string, arr); });
  return data.map((c) => mapCourse(c, byCourse.get(c.id) || []));
}

// Chi tiết 1 khóa live (landing) — KHÔNG trả meet_url (chỉ lộ qua API join)
export async function getLiveCourseBySlug(slug: string): Promise<LiveCourse | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: c } = await admin.from("courses").select("id, slug, title, subtitle, description, thumb, price, compare_price, category, level, instructor, capacity, instructor_bio, instructor_avatar, faq, guarantee, result_images")
    .eq("slug", slug).eq("format", "live").maybeSingle();
  if (!c) return null;
  const { data: sess } = await admin.from("live_sessions").select("id, title, starts_at, duration_min, recording_url").eq("course_id", c.id).order("starts_at");
  const { count } = await admin.from("enrollments").select("id", { count: "exact", head: true }).eq("course_slug", slug);
  const base = mapCourse(c, (sess || []) as unknown as LiveSession[], count || 0);

  // Đánh giá nổi bật do admin nhập
  const { data: tRows } = await admin.from("course_testimonials").select("name, avatar_url, role, content, rating").eq("course_id", c.id).order("position");
  const curated: Testimonial[] = (tRows || []).map((t) => ({ name: t.name as string, avatar: (t.avatar_url as string) || undefined, role: (t.role as string) || undefined, content: t.content as string, rating: (t.rating as number) || 5 }));
  // Review THẬT của học viên (rating ≥4, có nội dung)
  const { data: rv } = await admin.from("reviews").select("user_id, rating, body").eq("course_slug", slug).gte("rating", 4).not("body", "is", null).order("created_at", { ascending: false }).limit(8);
  let real: Testimonial[] = [];
  if (rv?.length) {
    const uids = [...new Set(rv.map((r) => r.user_id))];
    const { data: profs } = await admin.from("profiles").select("id, full_name, avatar_url").in("id", uids);
    const pm = new Map((profs || []).map((p) => [p.id, p]));
    real = rv.filter((r) => (r.body as string)?.trim()).map((r) => { const p = pm.get(r.user_id); return { name: (p?.full_name as string) || "Học viên", avatar: (p?.avatar_url as string) || undefined, role: "Học viên", content: r.body as string, rating: (r.rating as number) || 5 }; });
  }
  base.testimonials = [...curated, ...real].slice(0, 12);
  base.instructorBio = (c.instructor_bio as string) || undefined;
  base.instructorAvatar = (c.instructor_avatar as string) || undefined;
  base.guarantee = (c.guarantee as string) || undefined;
  const faqArr = Array.isArray(c.faq) ? (c.faq as Faq[]).filter((f) => f?.q && f?.a) : [];
  base.faq = faqArr.length ? faqArr : DEFAULT_LIVE_FAQ;
  base.resultImages = Array.isArray(c.result_images) ? (c.result_images as string[]).filter(Boolean) : [];
  return base;
}

// Khóa live mà user đã ghi danh + buổi sắp tới (cho "Lịch học của tôi")
export async function getMyLiveCourses(userId: string): Promise<LiveCourse[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: enr } = await admin.from("enrollments").select("course_slug").eq("user_id", userId);
  const slugs = (enr || []).map((e) => e.course_slug);
  if (!slugs.length) return [];
  const { data } = await admin.from("courses").select("id, slug, title, thumb, instructor")
    .in("slug", slugs).eq("format", "live");
  if (!data?.length) return [];
  const ids = data.map((c) => c.id);
  const { data: sess } = await admin.from("live_sessions").select("id, course_id, title, starts_at, duration_min, recording_url").in("course_id", ids).order("starts_at");
  const byCourse = new Map<string, LiveSession[]>();
  (sess || []).forEach((s) => { const arr = byCourse.get(s.course_id as string) || []; arr.push(s as unknown as LiveSession); byCourse.set(s.course_id as string, arr); });
  return data.map((c) => mapCourse(c, byCourse.get(c.id) || []));
}

// Khung giờ được phép vào lớp
export function joinWindow(startsAt: string, durationMin: number): { open: boolean; reason: "early" | "ended" | "ok"; opensAt: number } {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = start + durationMin * 60000 + JOIN_GRACE_AFTER_MS;
  const opensAt = start - JOIN_OPEN_BEFORE_MS;
  if (now < opensAt) return { open: false, reason: "early", opensAt };
  if (now > end) return { open: false, reason: "ended", opensAt };
  return { open: true, reason: "ok", opensAt };
}
