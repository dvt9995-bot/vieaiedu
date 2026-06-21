"use client";
import { useEffect, useRef, useState } from "react";

/* Trình phát YouTube ẩn hoàn toàn thương hiệu & chặn click về YouTube:
   - controls=0 → không hiện thanh điều khiển, logo, tiêu đề của YouTube
   - lớp phủ trong suốt bắt mọi cú chạm (play/pause) → iframe không bao giờ nhận click
     ⇒ không mở YouTube, không hiện video liên quan / "Watch on YouTube"
   - thanh điều khiển tùy chỉnh theo thương hiệu (play, tua, thời lượng, âm lượng, toàn màn hình) */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<void> | null = null;
function loadAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

const fmt = (s: number) => {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), x = Math.floor(s % 60);
  return `${m}:${x.toString().padStart(2, "0")}`;
};

export default function YouTubePlayer({ videoId, onEnded }: { videoId: string; onEnded?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadAPI().then(() => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new window.YT.Player(hostRef.current, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          controls: 0, modestbranding: 1, rel: 0, disablekb: 1, iv_load_policy: 3,
          playsinline: 1, fs: 0, cc_load_policy: 0, showinfo: 0, autoplay: 0,
        },
        events: {
          onReady: (e: any) => { setReady(true); setDur(e.target.getDuration() || 0); },
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState;
            setPlaying(e.data === S.PLAYING);
            if (e.data === S.PLAYING) setDur(e.target.getDuration() || 0);
            if (e.data === S.ENDED) onEnded?.();
          },
        },
      });
    });
    return () => { cancelled = true; try { playerRef.current?.destroy(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Vòng lặp cập nhật tiến độ
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = playerRef.current;
      if (p?.getCurrentTime) { setCur(p.getCurrentTime() || 0); const d = p.getDuration?.() || 0; if (d) setDur(d); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = () => { const p = playerRef.current; if (!p) return; playing ? p.pauseVideo() : p.playVideo(); };
  const seekFrac = (frac: number) => { const p = playerRef.current; const d = p?.getDuration?.() || dur; if (p && d) p.seekTo(d * Math.max(0, Math.min(1, frac)), true); };
  const onBar = (e: React.MouseEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); seekFrac((e.clientX - r.left) / r.width); };
  const toggleMute = () => { const p = playerRef.current; if (!p) return; if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); } };
  const fullscreen = () => { const el = wrapRef.current as any; if (document.fullscreenElement) document.exitFullscreen(); else (el?.requestFullscreen || el?.webkitRequestFullscreen)?.call(el); };

  const pct = dur ? (cur / dur) * 100 : 0;

  return (
    <div ref={wrapRef} className="group relative w-full h-full bg-black overflow-hidden select-none">
      {/* iframe YouTube (z-0) */}
      <div ref={hostRef} className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full pointer-events-none" />

      {/* Lớp phủ bắt click — iframe không bao giờ nhận click → không về YouTube */}
      <button
        aria-label={playing ? "Tạm dừng" : "Phát"}
        onClick={toggle} onDoubleClick={fullscreen}
        className="absolute inset-0 z-10 w-full h-full cursor-pointer"
      />

      {/* Nút play lớn khi đang dừng */}
      {ready && !playing && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-accent/90 shadow-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-7 h-7 ml-1 fill-white"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}
      {!ready && <div className="absolute inset-0 z-20 flex items-center justify-center text-white/70 text-sm">Đang tải video…</div>}

      {/* Thanh điều khiển tùy chỉnh (z-30, trên lớp phủ) */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-3 pb-2 pt-8 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {/* thanh tua */}
        <div onClick={onBar} className="h-1.5 w-full bg-white/25 rounded-full cursor-pointer mb-2 group/bar">
          <div className="h-full bg-accent rounded-full relative" style={{ width: `${pct}%` }}>
            <span className="absolute -right-1.5 -top-1 w-3.5 h-3.5 rounded-full bg-accent opacity-0 group-hover/bar:opacity-100" />
          </div>
        </div>
        <div className="flex items-center gap-3 text-white">
          <button onClick={toggle} className="cursor-pointer" aria-label={playing ? "Tạm dừng" : "Phát"}>
            {playing
              ? <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              : <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M8 5v14l11-7z" /></svg>}
          </button>
          <button onClick={toggleMute} className="cursor-pointer" aria-label="Âm lượng">
            {muted
              ? <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3 2.5 2.5-1 1L15.5 13 13 15.5l-1-1 2.5-2.5L12 9.5l1-1 2.5 2.5L18 8.5l1 1z" /></svg>
              : <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M4 9v6h4l5 5V4L8 9H4zm11 .5a4 4 0 010 5v-5z" /></svg>}
          </button>
          <span className="text-xs tabular-nums text-white/90">{fmt(cur)} / {fmt(dur)}</span>
          <button onClick={fullscreen} className="ml-auto cursor-pointer" aria-label="Toàn màn hình">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
