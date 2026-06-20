import pg from "pg"; import fs from "node:fs";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
await c.connect();
const sql = fs.readFileSync("supabase/migration-notification-system.sql","utf8");
try { await c.query(sql); console.log("✓ migration-notification-system.sql"); }
catch(e){ console.log("✗", e.message); }
for (const t of ["notification_prefs","push_subscriptions","notifications"]) {
  try{ const r=await c.query(`select count(*)::int n from ${t}`); console.log(` ${t}: ${r.rows[0].n}`);}catch(e){console.log(` ${t}: lỗi ${e.message.slice(0,40)}`);}
}
await c.end();
