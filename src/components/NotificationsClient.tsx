"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Notif { id: string; title: string; body: string | null; href: string | null; read: boolean; created_at: string; }

export default function NotificationsClient() {
  const [items, setItems] = useState<Notif[] | null>(null);

  async function load() {
    const supabase = createClient();
    if (!supabase) { setItems([]); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setItems([]); return; }
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setItems(data || []);
    if ((data || []).some((n) => !n.read)) await supabase.from("notifications").update({ read: true }).eq("read", false);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string) {
    const supabase = createClient(); if (!supabase) return;
    await supabase.from("notifications").delete().eq("id", id);
    setItems((a) => (a || []).filter((n) => n.id !== id));
  }

  return (
    <div className="container-x py-12 max-w-[680px]">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-tight">Thông báo</h1>
        <Link href="/settings/notifications" className="text-sm font-semibold text-ink-2 hover:text-accent">⚙ Cài đặt</Link>
      </div>
      {items === null ? <p className="text-ink-3">Đang tải…</p>
        : items.length === 0 ? <div className="text-center py-16 text-ink-3">Chưa có thông báo nào.</div>
        : (
          <ul className="space-y-2">
            {items.map((n) => {
              const Inner = (
                <div className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 hover:border-border-strong transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold">{n.title}</div>
                    {n.body && <div className="text-ink-2 text-sm mt-0.5">{n.body}</div>}
                    <div className="text-ink-3 text-xs mt-1">{new Date(n.created_at).toLocaleString("vi-VN")}</div>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); del(n.id); }} className="text-ink-3 hover:text-accent text-sm cursor-pointer">Xóa</button>
                </div>
              );
              return <li key={n.id}>{n.href ? <Link href={n.href}>{Inner}</Link> : Inner}</li>;
            })}
          </ul>
        )}
    </div>
  );
}
