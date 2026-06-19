import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";
import { COURSES } from "../src/lib/mock";

const CONN = process.env.DATABASE_URL!;
const FILES = [
  "migration-newsletter.sql",
  "migration-coupons.sql",
  "migration-catalog.sql",
  "migration-gamification.sql",
];

async function main() {
  const client = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("✓ Kết nối DB");

  for (const f of FILES) {
    const sql = fs.readFileSync(path.join("supabase", f), "utf8");
    try {
      await client.query(sql);
      console.log("✓ Chạy", f);
    } catch (e) {
      console.log("✗", f, "->", (e as Error).message);
    }
  }

  // Seed catalog nếu trống
  const { rows } = await client.query("select count(*)::int as n from courses");
  if (rows[0].n > 0) {
    console.log("• courses đã có", rows[0].n, "dòng — bỏ qua seed");
  } else {
    let inserted = 0;
    for (let i = 0; i < COURSES.length; i++) {
      const c = COURSES[i];
      const cr = await client.query(
        `insert into courses(slug,thumb,title,subtitle,description,category,level,price,compare_price,total_minutes,instructor,what_you_learn,rating,rating_count,students,likes,status,position)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'published',$17) returning id`,
        [c.slug, c.thumb, c.title, c.subtitle, c.description, c.category, c.level, c.price, c.comparePrice ?? null,
         c.totalMinutes, c.instructor, c.whatYouLearn, c.rating, c.ratingCount, c.students, c.likes, i]
      );
      const courseId = cr.rows[0].id;
      for (let si = 0; si < c.sections.length; si++) {
        const s = c.sections[si];
        const sr = await client.query(
          "insert into sections(course_id,title,position) values($1,$2,$3) returning id",
          [courseId, s.title, si]
        );
        const sectionId = sr.rows[0].id;
        for (let li = 0; li < s.lessons.length; li++) {
          const l = s.lessons[li];
          await client.query(
            "insert into lessons(section_id,course_id,title,type,duration_sec,is_preview,video_id,position) values($1,$2,$3,$4,$5,$6,$7,$8)",
            [sectionId, courseId, l.title, l.type, l.durationSec, l.isPreview, l.videoId ?? null, li]
          );
        }
      }
      inserted++;
    }
    console.log("✓ Seed", inserted, "khóa học");
  }

  // Tạo coupon mẫu
  await client.query("insert into coupons(code,percent_off,expires_at) values('VIE30',30, now()+interval '60 days') on conflict (code) do nothing");
  console.log("✓ Coupon mẫu VIE30 (giảm 30%)");

  // Tóm tắt
  for (const t of ["courses", "sections", "lessons", "coupons", "notifications", "subscribers"]) {
    try { const r = await client.query(`select count(*)::int n from ${t}`); console.log(`  ${t}: ${r.rows[0].n}`); } catch {}
  }
  await client.end();
  console.log("✅ XONG");
}
main().catch((e) => { console.error("LỖI:", e.message); process.exit(1); });
