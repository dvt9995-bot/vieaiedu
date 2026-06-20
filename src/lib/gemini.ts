import { getConfig } from "@/lib/settings";

export async function isGeminiConfigured() {
  return !!(await getConfig("gemini_api_key", "GEMINI_API_KEY"));
}

interface Rewritten { title: string; excerpt: string; body: string; }

// Viết lại một tin AI sang tiếng Việt theo giọng VIE AI EDU (markdown).
export async function rewriteArticle(input: { title: string; summary: string; sourceName: string }): Promise<Rewritten | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const model = (await getConfig("gemini_model")) || "gemini-2.5-flash";
  const prompt = `Bạn là biên tập viên của VIE AI EDU — nền tảng học AI cho người Việt. Viết lại tin tức AI dưới đây thành một bài blog tiếng Việt hấp dẫn, dễ hiểu, chuẩn SEO, KHÔNG sao chép nguyên văn.

Tiêu đề gốc: ${input.title}
Tóm tắt nguồn (${input.sourceName}): ${input.summary}

Yêu cầu:
- Giọng văn chuyên nghiệp, gần gũi, truyền cảm hứng học AI.
- Bài dài 350–550 từ, dùng Markdown: 2–4 mục \\n## tiêu đề phụ, có gạch đầu dòng khi hợp lý.
- Mở đầu hook, kết bài gợi mở liên hệ tới việc học/ứng dụng AI.
- Tự nhiên, không bịa số liệu. Nếu thiếu chi tiết thì viết tổng quan.

Trả về JSON đúng định dạng: {"title": "tiêu đề tiếng Việt mới", "excerpt": "tóm tắt 1-2 câu", "body": "nội dung markdown"}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.8 } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (!parsed.title || !parsed.body) return null;
    return { title: String(parsed.title), excerpt: String(parsed.excerpt || ""), body: String(parsed.body) };
  } catch {
    return null;
  }
}
