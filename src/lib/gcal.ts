import { getConfig } from "@/lib/settings";

// Tích hợp Google Calendar API: tự tạo sự kiện + sinh link Google Meet.
// Host = 1 tài khoản Google của nền tảng (admin kết nối 1 lần qua OAuth → lưu refresh_token).
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export async function gcalConfigured(): Promise<boolean> {
  return !!(await getConfig("gcal_client_id", "GCAL_CLIENT_ID")) && !!(await getConfig("gcal_refresh_token", "GCAL_REFRESH_TOKEN"));
}

async function accessToken(): Promise<string | null> {
  const client_id = await getConfig("gcal_client_id", "GCAL_CLIENT_ID");
  const client_secret = await getConfig("gcal_client_secret", "GCAL_CLIENT_SECRET");
  const refresh_token = await getConfig("gcal_refresh_token", "GCAL_REFRESH_TOKEN");
  if (!client_id || !client_secret || !refresh_token) return null;
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }) });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  return j?.access_token || null;
}

async function calId() { return (await getConfig("gcal_calendar_id", "GCAL_CALENDAR_ID")) || "primary"; }
async function tz() { return (await getConfig("gcal_timezone", "GCAL_TIMEZONE")) || "Asia/Ho_Chi_Minh"; }

// Tạo sự kiện + phòng Meet. Trả {meetUrl, eventId} hoặc null nếu chưa kết nối / lỗi.
export async function createMeetEvent(opts: { summary: string; description?: string; startISO: string; durationMin: number }): Promise<{ meetUrl: string; eventId: string } | null> {
  const token = await accessToken();
  if (!token) return null;
  const start = new Date(opts.startISO);
  const end = new Date(start.getTime() + opts.durationMin * 60000);
  const zone = await tz();
  const body = {
    summary: opts.summary,
    description: opts.description || "",
    start: { dateTime: start.toISOString(), timeZone: zone },
    end: { dateTime: end.toISOString(), timeZone: zone },
    conferenceData: { createRequest: { requestId: `vie-${start.getTime()}-${Math.random().toString(36).slice(2, 8)}`, conferenceSolutionKey: { type: "hangoutsMeet" } } },
  };
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(await calId())}/events?conferenceDataVersion=1`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  const meetUrl = j?.hangoutLink || (j?.conferenceData?.entryPoints || []).find((e: { entryPointType?: string; uri?: string }) => e.entryPointType === "video")?.uri;
  if (!meetUrl || !j?.id) return null;
  return { meetUrl, eventId: j.id };
}

export async function deleteMeetEvent(eventId: string): Promise<void> {
  const token = await accessToken();
  if (!token || !eventId) return;
  try { await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(await calId())}/events/${eventId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch { /* noop */ }
}

// OAuth: tạo URL đồng ý + đổi code lấy refresh_token
export async function oauthUrl(redirectUri: string): Promise<string | null> {
  const client_id = await getConfig("gcal_client_id", "GCAL_CLIENT_ID");
  if (!client_id) return null;
  const p = new URLSearchParams({ client_id, redirect_uri: redirectUri, response_type: "code", scope: SCOPE, access_type: "offline", prompt: "consent" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}
export async function exchangeCode(code: string, redirectUri: string): Promise<string | null> {
  const client_id = await getConfig("gcal_client_id", "GCAL_CLIENT_ID");
  const client_secret = await getConfig("gcal_client_secret", "GCAL_CLIENT_SECRET");
  if (!client_id || !client_secret) return null;
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id, client_secret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  return j?.refresh_token || null;
}
