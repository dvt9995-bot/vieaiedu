"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "./AuthModal";
import { createPost, currentUserId } from "@/lib/db";
import { track } from "@/lib/analytics";

export default function ShareCourseButton({ slug, title }: { slug: string; title: string }) {
  const { open } = useAuthModal();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function share() {
    const uid = await currentUserId();
    if (!uid) return open("login");
    const note = prompt("Chia sẻ cảm nhận của bạn về khóa này:", `Mình thấy khóa "${title}" rất hay, recommend nha! 🔥`);
    if (note === null) return;
    setBusy(true);
    const ok = await createPost(note || `Khóa "${title}" đáng học!`, null, slug);
    setBusy(false);
    if (ok) { track("share", { method: "community", item_id: slug }); router.push("/community"); }
    else open("login");
  }

  return (
    <button onClick={share} disabled={busy} className="w-full mt-2.5 rounded-full border border-border-strong hover:border-accent hover:text-accent text-ink-2 font-semibold py-3 cursor-pointer transition-colors">
      {busy ? "Đang chia sẻ…" : "↗ Chia sẻ lên cộng đồng"}
    </button>
  );
}
