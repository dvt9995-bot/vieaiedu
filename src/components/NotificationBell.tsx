"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Notif { id: string; title: string; body: string | null; href: string | null; read: boolean; created_at: string; }

export default function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setReady(false); return null; }
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(15);
    setItems(data || []); setReady(true);
    return user.id;
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    load().then((uid) => {
      if (!uid) return;
      channel = supabase
        .channel("notif:" + uid)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => setItems((arr) => [payload.new as Notif, ...arr].slice(0, 15)))
        .subscribe();
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [load]);

  const unread = items.filter((i) => !i.read).length;

  async function toggle() {
    const next = !open; setOpen(next);
    if (next && unread > 0) {
      const supabase = createClient();
      if (supabase) {
        await supabase.from("notifications").update({ read: true }).eq("read", false);
        setItems((arr) => arr.map((i) => ({ ...i, read: true })));
      }
    }
  }

  if (!ready) return null;

  return (
    <div className="relative">
      <button onClick={toggle} className="relative p-2 cursor-pointer text-ink-2 hover:text-ink" aria-label="Thông báo">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
        {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-card border border-border bg-surface shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-semibold text-sm">Thông báo</div>
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-ink-3 text-sm">Chưa có thông báo</div>
            ) : (
              <ul className="max-h-80 overflow-auto">
                {items.map((n) => {
                  const inner = (
                    <div className="px-4 py-3 hover:bg-bg-soft border-b border-border last:border-0">
                      <div className="font-medium text-sm">{n.title}</div>
                      {n.body && <div className="text-ink-2 text-xs mt-0.5">{n.body}</div>}
                    </div>
                  );
                  return <li key={n.id}>{n.href ? <Link href={n.href} onClick={() => setOpen(false)}>{inner}</Link> : inner}</li>;
                })}
              </ul>
            )}
            <Link href="/notifications" onClick={() => setOpen(false)} className="block text-center py-2.5 text-sm font-semibold text-accent border-t border-border hover:bg-bg-soft">Xem tất cả</Link>
          </div>
        </>
      )}
    </div>
  );
}
