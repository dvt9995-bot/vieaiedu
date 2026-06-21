"use client";
import { useEffect, useState } from "react";
import { mdToHtml } from "@/lib/md";
import { toast } from "./Toaster";

interface Sub { score: number | null; feedback: string | null; passed: boolean; content: string; created_at: string }

export default function AssignmentPanel({ slug, title, brief }: { slug: string; title?: string; brief: string }) {
  const [sub, setSub] = useState<Sub | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/assignment?slug=${encodeURIComponent(slug)}`).then((r) => r.json()).then((d) => {
      if (d.submission) { setSub(d.submission); setText(d.submission.content || ""); }
    }).catch(() => {});
  }, [slug]);

  async function submit() {
    if (text.trim().length < 20) return toast("Bài làm quá ngắn — hãy viết chi tiết hơn", "error");
    setBusy(true);
    const r = await fetch("/api/assignment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, content: text }) }).then((x) => x.json()).catch(() => ({}));
    setBusy(false);
    if (r.ok) { setSub({ score: r.score, feedback: r.feedback, passed: r.passed, content: text, created_at: new Date().toISOString() }); setOpen(false); toast(r.passed ? "🎉 Đạt! Xem nhận xét của AI" : "Đã chấm — xem nhận xét để cải thiện"); }
    else toast(r.error || "Chưa chấm được, thử lại sau", "error");
  }

  return (
    <section className="mt-8 rounded-card border border-border bg-bg-soft p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📝</span>
        <h3 className="text-lg font-extrabold tracking-tight">{title || "Bài tập thực hành"}</h3>
        <span className="text-[.65rem] font-bold text-accent bg-accent-weak px-2 py-0.5 rounded-full">AI chấm điểm</span>
      </div>
      <div className="prose-course text-ink-2 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(brief) }} />

      {sub && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`text-2xl font-extrabold ${sub.passed ? "text-success" : "text-accent"}`}>{sub.score}/100</div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sub.passed ? "bg-success/10 text-success" : "bg-accent-weak text-accent"}`}>{sub.passed ? "✓ Đạt" : "Cần cải thiện"}</span>
            <span className="text-ink-3 text-xs">AI đã chấm</span>
          </div>
          {sub.feedback && <div className="prose-course text-ink-2 text-sm mt-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(sub.feedback) }} />}
        </div>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-4 rounded-full bg-ink text-white font-semibold text-sm px-5 py-2.5 cursor-pointer">{sub ? "Nộp lại bài" : "Làm bài & nộp"}</button>
      ) : (
        <div className="mt-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Dán bài làm / mô tả sản phẩm / đường link của bạn ở đây…" className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent" />
          <div className="flex gap-2 mt-2">
            <button onClick={submit} disabled={busy} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold text-sm px-5 py-2.5 cursor-pointer disabled:opacity-60">{busy ? "AI đang chấm… (~15s)" : "Nộp cho AI chấm"}</button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border-strong font-semibold text-sm px-4 py-2.5 cursor-pointer">Hủy</button>
          </div>
        </div>
      )}
    </section>
  );
}
