import { Resend } from "resend";
import { formatVND } from "./format";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || "VIE AI EDU <no-reply@vieaiedu.vn>";

const resend = KEY ? new Resend(KEY) : null;
export const isEmailConfigured = () => !!resend;

function shell(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#202124">
    <div style="background:#e41e26;padding:20px;text-align:center;color:#fff;font-weight:800;font-size:20px;border-radius:12px 12px 0 0">VIE AI EDU</div>
    <div style="border:1px solid #e7e9ee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <h2 style="margin:0 0 12px">${title}</h2>${body}
      <p style="color:#8a909c;font-size:12px;margin-top:24px">vieaiedu.vn · Kiến tạo tri thức – Dẫn lối tương lai</p>
    </div></div>`;
}

export async function sendOrderReceipt(to: string, courseTitle: string, amount: number) {
  if (!resend) return;
  await resend.emails.send({
    from: FROM, to,
    subject: `Biên lai mua khóa học: ${courseTitle}`,
    html: shell("Thanh toán thành công 🎉", `<p>Bạn đã mua khóa <b>${courseTitle}</b>.</p>
      <p>Số tiền: <b>${formatVND(amount)}</b> · Truy cập trọn đời.</p>
      <p><a href="https://vieaiedu.vn/dashboard" style="background:#e41e26;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">Vào học ngay</a></p>`),
  }).catch(() => {});
}

export async function sendWelcome(to: string, name?: string) {
  if (!resend) return;
  await resend.emails.send({
    from: FROM, to,
    subject: "Chào mừng đến với VIE AI EDU",
    html: shell(`Xin chào ${name || "bạn"} 👋`, `<p>Cảm ơn bạn đã tham gia VIE AI EDU — nền tảng học AI dành cho người Việt.</p>
      <p><a href="https://vieaiedu.vn/courses" style="background:#e41e26;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">Khám phá khóa học</a></p>`),
  }).catch(() => {});
}
