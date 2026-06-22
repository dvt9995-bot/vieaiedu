// ID khách ẩn danh + phiên (session 30 phút nghỉ) cho analytics first-party.
function rnd() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export function anonId(): string {
  try {
    let id = localStorage.getItem("vie_anon");
    if (!id) { id = rnd(); localStorage.setItem("vie_anon", id); }
    return id;
  } catch { return ""; }
}

export function sessionId(): string {
  try {
    const now = Date.now();
    const last = parseInt(localStorage.getItem("vie_sess_t") || "0", 10);
    let sid = localStorage.getItem("vie_sess");
    if (!sid || now - last > 30 * 60 * 1000) { sid = rnd(); localStorage.setItem("vie_sess", sid); } // reset sau 30' nghỉ
    localStorage.setItem("vie_sess_t", String(now));
    return sid;
  } catch { return ""; }
}
