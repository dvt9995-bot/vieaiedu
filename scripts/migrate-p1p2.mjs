// Chạy migration P1/P2 + verify. Kết nối qua biến môi trường PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE.
import pg from "pg";
import fs from "node:fs";

const c = new pg.Client({ ssl: { rejectUnauthorized: false } });
await c.connect();
console.log("✓ Kết nối DB thành công\n");

for (const f of ["supabase/migration-coupon-limits.sql", "supabase/migration-assignments.sql"]) {
  const sql = fs.readFileSync(f, "utf8");
  try { await c.query(sql); console.log("✓ Chạy", f); }
  catch (e) { console.log("✗", f, "->", e.message); }
}

console.log("\n=== KIỂM TRA ===");
const checks = [
  ["coupons.max_uses", "select max_uses from coupons limit 1"],
  ["coupons.used_count", "select used_count from coupons limit 1"],
  ["orders.coupon_code", "select coupon_code from orders limit 1"],
  ["courses.assignment_brief", "select assignment_brief from courses limit 1"],
  ["assignment_submissions (bảng)", "select count(*)::int n from assignment_submissions"],
  ["RPC increment_coupon_use", "select pg_get_functiondef('increment_coupon_use(text)'::regprocedure) is not null as ok"],
];
for (const [name, q] of checks) {
  try { await c.query(q); console.log("  ✓", name); }
  catch (e) { console.log("  ✗", name, "->", e.message.slice(0, 60)); }
}

await c.end();
console.log("\n✅ XONG");
