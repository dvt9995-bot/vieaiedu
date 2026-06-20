"use client";
import { useEffect, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { toast } from "./Toaster";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({ targetId }: { targetId: string }) {
  const { open } = useAuthModal();
  const [following, setFollowing] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = createClient();
    c?.auth.getUser().then(({ data }) => {
      setMe(data.user?.id ?? null);
      if (data.user) fetch(`/api/follow?targetId=${targetId}`).then((r) => r.json()).then((d) => setFollowing(!!d.following)).catch(() => {});
    });
  }, [targetId]);

  if (me === targetId) return null; // không tự theo dõi mình

  async function toggle() {
    if (!me) return open("login");
    const next = !following;
    setBusy(true); setFollowing(next);
    const r = await fetch("/api/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId, action: next ? "follow" : "unfollow" }) }).then((x) => x.json()).catch(() => ({}));
    setBusy(false);
    if (r.error) { setFollowing(!next); return toast("Không thực hiện được", "error"); }
    toast(next ? "Đã theo dõi" : "Đã bỏ theo dõi");
  }

  return (
    <button onClick={toggle} disabled={busy} className={`rounded-full font-semibold text-sm px-5 py-2 cursor-pointer transition-colors ${following ? "border border-border-strong text-ink-2 hover:border-accent hover:text-accent" : "bg-accent hover:bg-accent-700 text-white"}`}>
      {following ? "✓ Đang theo dõi" : "+ Theo dõi"}
    </button>
  );
}
