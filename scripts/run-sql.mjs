import pg from "pg"; import fs from "node:fs";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
await c.connect();
const sql = fs.readFileSync(process.env.SQLFILE,"utf8");
try { await c.query(sql); console.log("✓", process.env.SQLFILE); }
catch(e){ console.log("✗", e.message); }
for (const t of ["app_settings","coupons"]) { try{ const r=await c.query(`select count(*)::int n from ${t}`); console.log(` ${t}: ${r.rows[0].n}`);}catch(e){console.log(` ${t}: ${e.message.slice(0,40)}`);} }
try{ const r=await c.query("select admin_overview() as o"); console.log(" admin_overview RPC OK:", JSON.stringify(r.rows[0].o).slice(0,80)); }catch(e){ console.log(" admin_overview:", e.message.slice(0,50)); }
await c.end();
