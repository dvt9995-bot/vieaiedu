"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Course, Lesson } from "@/lib/types";
import { SAMPLE_QUIZ } from "@/lib/mock";
import { loadProgress, saveLesson, loadNotes, addNote as dbAddNote, saveQuizAttempt } from "@/lib/db";

type Tab = "overview" | "notes" | "quiz";
interface Note { lessonId: string; t: number; body: string; }

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function LearnClient({ course, initialLesson, locked = false, videoUrls = {} }: { course: Course; initialLesson?: string; locked?: boolean; videoUrls?: Record<string, string> }) {
  const flat: Lesson[] = useMemo(() => course.sections.flatMap((s) => s.lessons), [course]);
  const accessible = (l: Lesson) => !locked || l.isPreview;

  const [current, setCurrent] = useState<Lesson>(
    flat.find((l) => l.id === initialLesson) ?? flat[0]
  );
  const [done, setDone] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("overview");
  const [pos, setPos] = useState(0);          // vị trí "xem" giả lập (giây)
  const [playing, setPlaying] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [quizDone, setQuizDone] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [certCode, setCertCode] = useState<string | null>(null);
  const [certGate, setCertGate] = useState<{ paidDone: number; needed: number } | null>(null);

  // Khôi phục tiến độ + ghi chú (DB nếu đăng nhập, else localStorage)
  useEffect(() => {
    let on = true;
    (async () => {
      const p = await loadProgress(course.slug);
      const n = await loadNotes(course.slug, flat.map((l) => l.id));
      if (!on) return;
      setDone(new Set(p.done));
      setNotes(n.map((x) => ({ lessonId: x.lessonId, t: x.t, body: x.body })));
    })();
    return () => { on = false; };
  }, [course.slug, flat]);

  // Mô phỏng phát video → tăng vị trí
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPos((p) => {
        const np = p + 1;
        if (np >= current.durationSec) { setPlaying(false); markDone(current.id); return current.durationSec; }
        return np;
      });
    }, 250); // nhanh để demo
    return () => clearInterval(id);
  }, [playing, current]);

  useEffect(() => { setPos(0); setPlaying(false); }, [current]);

  function markDone(id: string) {
    setDone((d) => { const n = new Set(d); n.add(id); return n; });
    saveLesson(course.slug, id, true);
  }
  function toggleDone(id: string) {
    setDone((d) => {
      const n = new Set(d); const willDone = !n.has(id);
      willDone ? n.add(id) : n.delete(id);
      saveLesson(course.slug, id, willDone);
      return n;
    });
  }
  function addNote() {
    if (!noteText.trim()) return;
    const note = { lessonId: current.id, t: Math.floor(pos), body: noteText.trim() };
    const n = [...notes, note].sort((a, b) => a.t - b.t);
    setNotes(n); dbAddNote(course.slug, note, n); setNoteText("");
  }
  function submitQuiz() {
    const correct = SAMPLE_QUIZ.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    const score = Math.round((correct / SAMPLE_QUIZ.questions.length) * 100);
    setQuizScore(score); setQuizDone(true);
    saveQuizAttempt(`${course.slug}:intro`, score, score >= SAMPLE_QUIZ.passScore);
  }

  const progress = Math.round((done.size / flat.length) * 100);
  const allDone = done.size === flat.length;
  const quizPassed = quizDone && quizScore >= SAMPLE_QUIZ.passScore;
  const completed = allDone && quizPassed;
  const lessonNotes = notes.filter((n) => n.lessonId === current.id);

  // Khi hoàn thành khóa → cấp chứng chỉ (1 lần)
  useEffect(() => {
    if (completed && !certCode) {
      fetch("/api/complete-course", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: course.slug }) })
        .then((r) => r.json()).then((d) => {
          if (d.code) setCertCode(d.code);
          else if (d.eligible === false) setCertGate({ paidDone: d.paidDone || 0, needed: d.needed || 5 });
        }).catch(() => {});
    }
  }, [completed, certCode, course.slug]);

  return (
    <div className="grid lg:grid-cols-[1fr_340px] min-h-[calc(100vh-4rem)]">
      {/* Main */}
      <div className="border-r border-border">
        {/* Player */}
        <div className="relative bg-ink aspect-video flex items-center justify-center text-white">
          <svg className="absolute inset-0 w-full h-full opacity-[.08]" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke="#fff" strokeWidth="1"><circle cx="100" cy="60" r="50" /><circle cx="100" cy="60" r="32" /></g></svg>
          {accessible(current) && videoUrls[current.id] ? (
            <iframe src={videoUrls[current.id]} className="absolute inset-0 w-full h-full border-0" loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          ) : accessible(current) ? (
            <>
              <button onClick={() => setPlaying((p) => !p)} className="z-10 w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center cursor-pointer transition">
                {playing ? (
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white ml-1"><path d="M8 5v14l11-7z" /></svg>
                )}
              </button>
              <div className="absolute bottom-0 inset-x-0 px-4 pb-3">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${(pos / current.durationSec) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs text-white/70 mt-1.5"><span>{fmt(pos)}</span><span>{fmt(current.durationSec)}</span></div>
              </div>
            </>
          ) : (
            <div className="z-10 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white/90"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm3 8H9V7a3 3 0 016 0z" /></svg>
              </div>
              <p className="font-semibold">Bài học bị khóa</p>
              <p className="text-white/60 text-sm mt-1 mb-4">Mua khóa học để mở toàn bộ bài giảng.</p>
              <Link href={`/courses/${course.slug}`} className="inline-flex rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-5 py-2.5 text-sm transition-colors">Mua khóa học</Link>
            </div>
          )}
        </div>

        {/* Lesson header + tabs */}
        <div className="px-6 pt-5">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-extrabold tracking-tight">{current.title}</h1>
            <button onClick={() => toggleDone(current.id)} className={`flex-none text-sm font-semibold px-3.5 py-2 rounded-full border cursor-pointer transition-colors ${done.has(current.id) ? "bg-success text-white border-success" : "border-border-strong text-ink-2 hover:border-ink-3"}`}>
              {done.has(current.id) ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}
            </button>
          </div>
          <div className="flex gap-1 mt-5 border-b border-border">
            {([["overview", "Tổng quan"], ["notes", `Ghi chú (${notes.length})`], ["quiz", "Quiz"]] as [Tab, string][]).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px cursor-pointer transition-colors ${tab === t ? "border-accent text-accent" : "border-transparent text-ink-2 hover:text-ink"}`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 py-6">
          {tab === "overview" && (
            <div className="text-ink-2 leading-relaxed">
              <p>Đây là phần nội dung/tài liệu của bài <b>{current.title}</b>. Khi nối Bunny.net, video thật sẽ phát ở trên với signed URL chống tải trộm; vị trí xem được lưu tự động để bạn học tiếp đúng chỗ.</p>
              <a className="inline-flex items-center gap-2 mt-4 text-accent font-semibold" href="#">⬇ Tải tài liệu bài học (PDF)</a>
            </div>
          )}

          {tab === "notes" && (
            <div>
              <div className="flex gap-2 mb-4">
                <span className="flex-none px-2.5 py-2 rounded-lg bg-bg-soft border border-border text-sm font-mono text-ink-2">@ {fmt(pos)}</span>
                <input value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Ghi chú tại thời điểm này..." className="flex-1 px-3.5 py-2 rounded-lg border border-border-strong outline-none focus:border-accent" />
                <button onClick={addNote} className="px-4 rounded-lg bg-accent hover:bg-accent-700 text-white font-semibold cursor-pointer">Lưu</button>
              </div>
              {lessonNotes.length === 0 ? (
                <p className="text-ink-3 text-sm">Chưa có ghi chú cho bài này. Tạm dừng video và ghi lại ý quan trọng.</p>
              ) : (
                <ul className="space-y-2">
                  {lessonNotes.map((n, i) => (
                    <li key={i} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-surface">
                      <button onClick={() => setPos(n.t)} className="flex-none text-accent font-mono text-sm font-semibold cursor-pointer">{fmt(n.t)}</button>
                      <span className="text-ink-2 text-sm">{n.body}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "quiz" && (
            <div>
              <h3 className="font-bold text-lg mb-1">{SAMPLE_QUIZ.title}</h3>
              <p className="text-ink-3 text-sm mb-5">Cần đạt {SAMPLE_QUIZ.passScore}% để qua. Chấm điểm tự động.</p>
              {SAMPLE_QUIZ.questions.map((q, qi) => (
                <div key={qi} className="mb-5">
                  <p className="font-semibold mb-2">{qi + 1}. {q.question}</p>
                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => {
                      const sel = answers[qi] === oi;
                      const showCorrect = quizDone && oi === q.correct;
                      const showWrong = quizDone && sel && oi !== q.correct;
                      return (
                        <button key={oi} disabled={quizDone} onClick={() => setAnswers({ ...answers, [qi]: oi })}
                          className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors cursor-pointer ${showCorrect ? "border-success bg-success/10 text-success" : showWrong ? "border-accent bg-accent-weak text-accent" : sel ? "border-ink bg-bg-soft" : "border-border hover:border-border-strong"}`}>
                          {opt}{showCorrect && " ✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {!quizDone ? (
                <button onClick={submitQuiz} disabled={Object.keys(answers).length < SAMPLE_QUIZ.questions.length} className="rounded-full bg-accent hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 cursor-pointer transition">Nộp bài</button>
              ) : (
                <div className={`p-4 rounded-card border ${quizPassed ? "border-success bg-success/10" : "border-accent bg-accent-weak"}`}>
                  <b className={quizPassed ? "text-success" : "text-accent"}>{quizPassed ? "🎉 Đạt!" : "Chưa đạt"} — {quizScore}%</b>
                  <button onClick={() => { setQuizDone(false); setAnswers({}); }} className="ml-3 text-sm underline cursor-pointer">Làm lại</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="bg-bg-soft">
        <div className="p-5 border-b border-border sticky top-16 bg-bg-soft z-10">
          <Link href={`/courses/${course.slug}`} className="text-ink-3 text-sm hover:text-ink">← {course.title}</Link>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-semibold">Tiến độ</span><span className="text-ink-2">{done.size}/{flat.length} bài · {progress}%</span>
          </div>
          <div className="h-2 bg-border rounded-full mt-2 overflow-hidden"><div className="h-full bg-success transition-all" style={{ width: `${progress}%` }} /></div>
          {completed && (
            certCode ? (
              <Link href={`/certificate/${certCode}`} className="mt-3 block text-center rounded-full bg-gold/90 hover:bg-gold text-ink font-semibold py-2.5 text-sm transition">🏆 Nhận chứng chỉ</Link>
            ) : certGate ? (
              <div className="mt-3 rounded-lg bg-surface border border-border p-3 text-center text-xs text-ink-2">
                ✅ Đã hoàn thành khóa này! Cần hoàn thành <b className="text-accent">{Math.max(0, certGate.needed - certGate.paidDone)} khóa trả phí</b> nữa để được cấp chứng chỉ. ({certGate.paidDone}/{certGate.needed})
              </div>
            ) : (
              <div className="mt-3 block text-center rounded-full bg-gold/40 text-ink/70 font-semibold py-2.5 text-sm">Đang xử lý chứng chỉ…</div>
            )
          )}
        </div>
        <div className="p-3">
          {course.sections.map((s) => (
            <div key={s.id} className="mb-3">
              <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-3">{s.title}</div>
              {s.lessons.map((l) => (
                <button key={l.id} onClick={() => setCurrent(l)} className={`w-full text-left flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${current.id === l.id ? "bg-surface shadow-soft" : "hover:bg-surface/60"}`}>
                  <span className={`flex-none w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${done.has(l.id) ? "bg-success border-success text-white" : "border-border-strong text-transparent"}`}>✓</span>
                  <span className={`flex-1 ${current.id === l.id ? "font-semibold" : "text-ink-2"}`}>{l.title}</span>
                  {accessible(l)
                    ? l.isPreview && locked && <span className="text-[.65rem] font-semibold text-accent">Xem thử</span>
                    : <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-ink-3"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm3 8H9V7a3 3 0 016 0z" /></svg>}
                  <span className="text-ink-3 text-xs">{fmt(l.durationSec)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
