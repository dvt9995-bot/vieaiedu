"use client";
import { useEffect, useState } from "react";
import { toast } from "@/components/Toaster";
import { useAuthModal } from "@/components/AuthModal";

interface QA { id: string; question: string; answer?: string | null; answered_at?: string | null; created_at: string; name: string }

export default function ProductQA({ productId }: { productId: string }) {
  const { open } = useAuthModal();
  const [items, setItems] = useState<QA[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => fetch(`/api/shop/qa?product_id=${productId}`).then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => setItems([]));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [productId]);

  async function ask() {
    if (!q.trim()) return;
    setBusy(true);
    const r = await fetch("/api/shop/qa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: productId, question: q }) });
    setBusy(false);
    if (r.status === 401) return open("register");
    if (r.ok) { setQ(""); toast("Đã gửi câu hỏi — người bán sẽ trả lời sớm"); load(); } else { const d = await r.json(); toast(d.error || "Lỗi"); }
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-extrabold tracking-tight mb-3">Hỏi &amp; đáp về sản phẩm</h2>
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Đặt câu hỏi cho người bán…" className="flex-1 px-3.5 py-2.5 rounded-full border border-border-strong bg-surface text-sm outline-none focus:border-accent" />
        <button onClick={ask} disabled={busy} className="rounded-full bg-accent hover:bg-accent-700 text-white text-sm font-semibold px-4 py-2.5 cursor-pointer disabled:opacity-60">Gửi</button>
      </div>
      {items === null ? <p className="text-ink-3 text-sm">Đang tải…</p>
        : items.length === 0 ? <p className="text-ink-3 text-sm">Chưa có câu hỏi nào. Hãy là người đầu tiên!</p>
        : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-card border border-border bg-surface p-4">
                <div className="text-sm"><b>{it.name}:</b> {it.question}</div>
                {it.answer && <div className="mt-2 pl-3 border-l-2 border-accent text-sm text-ink-2"><b className="text-accent">Người bán:</b> {it.answer}</div>}
              </div>
            ))}
          </div>
        )}
    </section>
  );
}
