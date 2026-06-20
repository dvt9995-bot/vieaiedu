"use client";
import { useEffect, useState } from "react";

interface U { id: string; email: string; name: string; role: string; studentCode: string; banned: boolean; courses: number; }

export default function UserManager() {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() { setLoading(true); const r = await fetch("/api/admin/users").then((x) => x.json()).catch(() => ({ users: [] })); setUsers(r.users || []); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    load();
  }

  const filtered = users.filter((u) => !q || `${u.email} ${u.name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-bold text-lg">Học viên <span className="text-ink-3 font-normal">({users.length})</span></h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm email/tên…" className="px-3 py-2 rounded-lg border border-border-strong bg-surface text-sm outline-none focus:border-accent" />
      </div>
      <div className="rounded-card border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead><tr className="bg-bg-soft text-ink-3 text-left text-xs uppercase tracking-wide">
            <th className="px-4 py-3 font-semibold">Người dùng</th><th className="px-4 py-3 font-semibold">Mã học viên</th><th className="px-4 py-3 font-semibold">Khóa</th><th className="px-4 py-3 font-semibold">Quyền</th><th className="px-4 py-3"></th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-3">Đang tải…</td></tr>
            : filtered.map((u) => (
              <tr key={u.id} className={`border-t border-border ${u.banned ? "opacity-50" : ""}`}>
                <td className="px-4 py-3"><div className="font-medium">{u.name || "—"}</div><div className="text-ink-3 text-xs">{u.email}</div></td>
                <td className="px-4 py-3">
                  <input defaultValue={u.studentCode} onBlur={(e) => e.target.value !== u.studentCode && patch(u.id, { studentCode: e.target.value })}
                    className="font-mono text-xs w-28 rounded border border-border-strong bg-surface px-2 py-1 outline-none focus:border-accent" />
                </td>
                <td className="px-4 py-3 text-ink-2">{u.courses}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} className="rounded-lg border border-border-strong bg-surface text-sm px-2 py-1.5 cursor-pointer">
                    <option value="student">Học viên</option><option value="instructor">Giảng viên</option><option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => patch(u.id, { ban: !u.banned })} className={`text-sm font-semibold cursor-pointer ${u.banned ? "text-success" : "text-accent"}`}>{u.banned ? "Mở khóa" : "Khóa"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
