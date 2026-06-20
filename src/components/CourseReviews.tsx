"use client";
import { useEffect, useState } from "react";
import { useAuthModal } from "./AuthModal";
import { toast } from "./Toaster";
import { track } from "@/lib/analytics";

interface Review { rating: number; body: string; created_at: string; author: string; avatar: string | null }

function Stars({ n, size = "text-base" }: { n: number; size?: string }) {
  return <span className={`text-gold ${size}`}>{"★".repeat(Math.round(n))}<span className="text-border-strong">{"★".repeat(5 - Math.round(n))}</span></span>;
}

export default function CourseReviews({ slug }: { slug: string }) {
  const { open } = useAuthModal();
  const [data, setData] = useState<{ reviews: Review[]; avg: number; count: number }>({ reviews: [], avg: 0, count: 0 });
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() { const r = await fetch(`/api/reviews?slug=${slug}`).then((x) => x.json()).catch(() => null); if (r) setData(r); }
  useEffect(() => { load(); }, [slug]);

  async function submit() {
    setBusy(true);
    const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, rating, body }) }).then((x) => x.json()).catch(() => ({}));
    setBusy(false);
    if (r.ok) { track("review_submit", { item_id: slug, rating }); toast("Cảm ơn đánh giá của bạn!"); setBody(""); load(); }
    else if (r.error?.includes("đăng nhập")) open("login");
    else toast(r.error || "Không gửi được", "error");
  }

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-2xl font-extrabold tracking-tight">Đánh giá</h2>
        {data.count > 0 && <span className="text-ink-2 text-sm"><Stars n={data.avg} /> <b className="text-ink">{data.avg}</b>/5 · {data.count} đánh giá</span>}
      </div>

      {/* Form đánh giá */}
      <div className="rounded-card border border-border bg-bg-soft p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold">Chấm điểm:</span>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} className={`text-2xl cursor-pointer ${i <= rating ? "text-gold" : "text-border-strong"}`} aria-label={`${i} sao`}>★</button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Chia sẻ cảm nhận của bạn về khóa học…" className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent resize-none min-h-[70px]" />
        <button onClick={submit} disabled={busy} className="mt-3 rounded-full bg-accent hover:bg-accent-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer transition-colors">{busy ? "Đang gửi…" : "Gửi đánh giá"}</button>
        <p className="text-ink-3 text-xs mt-2">Chỉ học viên đã ghi danh mới đánh giá được.</p>
      </div>

      {/* Danh sách */}
      {data.reviews.length === 0 ? (
        <p className="text-ink-3">Chưa có đánh giá. Hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-4">
          {data.reviews.map((r, i) => (
            <div key={i} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-full bg-accent text-white grid place-items-center font-bold text-sm overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.avatar ? <img src={r.avatar} alt="" className="w-full h-full object-cover" /> : r.author[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm">{r.author}</div>
                  <Stars n={r.rating} size="text-xs" />
                </div>
              </div>
              {r.body && <p className="text-ink-2 text-sm">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
