import { describe, it, expect } from "vitest";
import { formatVND, formatDuration } from "../src/lib/format";
import { mdToHtml } from "../src/lib/md";
import { rateLimit } from "../src/lib/ratelimit";
import { orderCode } from "../src/lib/sepay";

describe("format", () => {
  it("formatVND có đơn vị đ + 0 = Miễn phí", () => {
    expect(formatVND(699000)).toContain("đ");
    expect(formatVND(0)).toBe("Miễn phí");
  });
  it("formatDuration: phút / giờ", () => {
    expect(formatDuration(30)).toBe("30 phút");
    expect(formatDuration(120)).toBe("2 giờ");
  });
});

describe("mdToHtml", () => {
  it("chuyển heading + bold + escape", () => {
    const html = mdToHtml("## Tiêu đề\n**đậm**");
    expect(html).toContain("<h2");
    expect(html).toContain("<strong>đậm</strong>");
  });
  it("escape thẻ HTML nguy hiểm", () => {
    expect(mdToHtml("<script>x</script>")).not.toContain("<script>");
  });
});

describe("rateLimit", () => {
  it("chặn khi vượt ngưỡng", () => {
    const k = "test:" + Math.random();
    let allowed = 0;
    for (let i = 0; i < 5; i++) if (rateLimit(k, 3, 60000)) allowed++;
    expect(allowed).toBe(3);
  });
});

describe("orderCode", () => {
  it("tiền tố VIE + viết hoa, bỏ gạch", () => {
    const c = orderCode("abc-123-def-456");
    expect(c.startsWith("VIE")).toBe(true);
    expect(c).not.toContain("-");
    expect(c).toBe(c.toUpperCase());
  });
});
