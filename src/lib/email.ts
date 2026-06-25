import { Resend } from "resend";
import { getConfig } from "@/lib/settings";
import { formatVND } from "./format";

async function getResend() {
  const key = await getConfig("resend_api_key", "RESEND_API_KEY");
  return key ? new Resend(key) : null;
}
async function fromAddr() {
  return (await getConfig("resend_from", "RESEND_FROM")) || "VIE AI EDU <no-reply@longnam.com>";
}
export async function isEmailConfigured() {
  return !!(await getConfig("resend_api_key", "RESEND_API_KEY"));
}

function shell(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#202124">
    <div style="background:#e41e26;padding:20px;text-align:center;color:#fff;font-weight:800;font-size:20px;border-radius:12px 12px 0 0">VIE AI EDU</div>
    <div style="border:1px solid #e7e9ee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <h2 style="margin:0 0 12px">${title}</h2>${body}
      <p style="color:#8a909c;font-size:12px;margin-top:24px">vieaiedu.vn · Kiến tạo tri thức – Dẫn lối tương lai</p>
    </div></div>`;
}

export async function sendGenericEmail(to: string, subject: string, title: string, body: string, href?: string) {
  const resend = await getResend(); if (!resend) return;
  const cta = href ? `<p><a href="https://vieaiedu.vn${href}" style="background:#e41e26;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">Xem ngay</a></p>` : "";
  await resend.emails.send({ from: await fromAddr(), to, subject, html: shell(title, `<p>${body}</p>${cta}`) }).catch(() => {});
}

export async function sendOrderReceipt(to: string, courseTitle: string, amount: number) {
  const resend = await getResend(); if (!resend) return;
  await resend.emails.send({
    from: await fromAddr(), to, subject: `Biên lai mua khóa học: ${courseTitle}`,
    html: shell("Thanh toán thành công 🎉", `<p>Bạn đã mua khóa <b>${courseTitle}</b>.</p>
      <p>Số tiền: <b>${formatVND(amount)}</b> · Truy cập trọn đời.</p>
      <p><a href="https://vieaiedu.vn/dashboard" style="background:#e41e26;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">Vào học ngay</a></p>`),
  }).catch(() => {});
}

// Email sau khi mua khóa qua LANDING: xác nhận đơn + tài khoản mới + nút đăng nhập 1-chạm + hướng dẫn vào học.
export async function sendCourseWelcome(to: string, opts: { name?: string; courseTitle: string; amount: number; loginLink: string; isLive?: boolean; firstSession?: string }) {
  const resend = await getResend(); if (!resend) return;
  const join = opts.isLive
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;margin:14px 0">
         <p style="margin:0 0 6px"><b>🔴 Đây là khóa học TRỰC TIẾP qua Google Meet.</b></p>
         ${opts.firstSession ? `<p style="margin:0 0 6px">Buổi học đầu tiên: <b>${opts.firstSession}</b>.</p>` : ""}
         <p style="margin:0">Đến giờ học, bạn vào mục <b>“Học của tôi”</b> rồi bấm <b>“Vào lớp”</b> — link Google Meet mở 15 phút trước giờ. Hệ thống sẽ nhắc bạn trước buổi học.</p>
       </div>`
    : `<p>Khóa học đã được kích hoạt. Bạn có thể vào học ngay, truy cập trọn đời.</p>`;
  await resend.emails.send({
    from: await fromAddr(), to, subject: `✅ Xác nhận đơn hàng & tài khoản — ${opts.courseTitle}`,
    html: shell("Cảm ơn bạn đã đăng ký! 🎉", `
      <p>Chào ${opts.name || "bạn"}, đơn hàng của bạn đã <b>thanh toán thành công</b>.</p>
      <p>Khóa học: <b>${opts.courseTitle}</b><br/>Số tiền: <b>${formatVND(opts.amount)}</b></p>
      <div style="background:#f5f6f8;border-radius:10px;padding:14px;margin:14px 0">
        <p style="margin:0 0 8px"><b>Tài khoản học của bạn đã được tạo tự động</b> với email <b>${to}</b>.</p>
        <p style="margin:0">Bấm nút bên dưới để <b>đăng nhập ngay</b> (không cần mật khẩu). Sau khi vào, bạn có thể đặt mật khẩu trong mục <b>Cài đặt tài khoản</b>.</p>
      </div>
      <p><a href="${opts.loginLink}" style="background:#e41e26;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;display:inline-block;font-weight:700">Đăng nhập & vào học ngay →</a></p>
      ${join}
      <p style="color:#8a909c;font-size:13px;margin-top:16px">Nếu nút trên không hoạt động, hãy vào <b>vieaiedu.vn</b> → Đăng nhập bằng email <b>${to}</b> → chọn “Quên mật khẩu” để đặt mật khẩu mới.</p>`),
  }).catch(() => {});
}

export async function sendWelcome(to: string, name?: string) {
  const resend = await getResend(); if (!resend) return;
  await resend.emails.send({
    from: await fromAddr(), to, subject: "Chào mừng đến với VIE AI EDU",
    html: shell(`Xin chào ${name || "bạn"} 👋`, `<p>Cảm ơn bạn đã tham gia VIE AI EDU — nền tảng học AI dành cho người Việt.</p>
      <p><a href="https://vieaiedu.vn/courses" style="background:#e41e26;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">Khám phá khóa học</a></p>`),
  }).catch(() => {});
}
