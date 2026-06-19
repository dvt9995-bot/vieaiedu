import type { Metadata } from "next";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bảng xếp hạng" };

interface Row { user_id: string; full_name: string | null; avatar_url: string | null; completed: number; }

export default async function LeaderboardPage() {
  let rows: Row[] = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase!.rpc("leaderboard");
    rows = (data as Row[]) || [];
  }
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="container-x py-12 max-w-[680px]">
      <div className="text-center mb-10">
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-tight">Bảng xếp hạng</h1>
        <p className="text-ink-2 text-lg mt-2">Top học viên chăm chỉ nhất — theo số bài đã hoàn thành.</p>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-16 text-ink-3">Chưa có dữ liệu xếp hạng. Hãy là người hoàn thành bài học đầu tiên!</div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.user_id} className={`flex items-center gap-4 rounded-card border p-4 ${i < 3 ? "border-gold/40 bg-gold/5" : "border-border bg-surface"}`}>
              <div className="w-8 text-center font-extrabold text-lg">{medal[i] || i + 1}</div>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">{(r.full_name || "H")[0]}</div>
              <div className="flex-1 font-semibold">{r.full_name || "Học viên"}</div>
              <div className="text-ink-2 text-sm"><b className="text-ink">{r.completed}</b> bài</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
