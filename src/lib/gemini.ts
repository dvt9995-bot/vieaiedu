import { getConfig } from "@/lib/settings";

export async function isGeminiConfigured() {
  return !!(await getConfig("gemini_api_key", "GEMINI_API_KEY"));
}

// Kiểm tra sức khỏe API: phát hiện hết tín dụng / sai key / model gỡ.
export async function geminiHealthCheck(): Promise<{ ok: boolean; reason?: string }> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return { ok: false, reason: "Chưa cấu hình API key" };
  const model = (await getConfig("gemini_model")) || "gemini-2.5-flash";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      signal: AbortSignal.timeout(15000),
    });
    if (r.ok) return { ok: true };
    if (r.status === 429) return { ok: false, reason: "Hết hạn mức / tín dụng API (429)" };
    if (r.status === 400 || r.status === 403) return { ok: false, reason: "API key không hợp lệ hoặc bị từ chối" };
    if (r.status === 404) return { ok: false, reason: `Model '${model}' không còn khả dụng` };
    return { ok: false, reason: `Lỗi API (${r.status})` };
  } catch {
    return { ok: false, reason: "Không kết nối được tới Gemini" };
  }
}

interface Rewritten { title: string; excerpt: string; body: string; }

export type ImgRef = { data: string; mime: string };

// Sinh ẢNH BÌA khóa học bằng Gemini (Nano Banana Pro). refs = ảnh tham chiếu (nhân vật/logo, tùy chọn).
export async function generateCoverImage(title: string, refs: ImgRef[] = []): Promise<{ data: string; mime: string } | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const hasRefs = refs.length > 0;
  // Prompt theo Bộ nhận diện VIE AI EDU (đỏ #E41E26 + vàng #F4B400, premium, AI/giáo dục)
  const prompt = `Professional widescreen 16:9 online course cover image for "VIE AI EDU", a premium Vietnamese AI education platform.
Course topic: "${title}".
Visualize this exact topic with modern, relevant AI & technology iconography (glowing neural networks, circuit lines, abstract data nodes, holographic futuristic elements that clearly represent the topic).
Style: clean premium 3D/flat illustration, sophisticated, trustworthy, high-tech yet friendly. Single clear focal point, uncluttered composition.
Brand colors: crimson red (#E41E26) and warm gold (#F4B400) as the primary accents, over an elegant deep gradient background (charcoal/navy to soft light). Soft cinematic lighting, depth of field, subtle geometric patterns.
High quality, sharp, vibrant.
${hasRefs
  ? "Use the provided reference image(s): feature the depicted person/character as the main subject of the cover, and tastefully integrate the provided platform/brand logo. Do NOT add any other text or words."
  : "ABSOLUTELY NO text, NO words, NO letters, NO numbers, NO logos, NO watermark."}`;

  const parts: Record<string, unknown>[] = [
    ...refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.data } })),
    { text: prompt },
  ];

  const models = [(await getConfig("gemini_image_model")) || "gemini-3-pro-image-preview", "gemini-2.5-flash-image"];
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (!model) continue;
    try {
      const body: Record<string, unknown> = {
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE"], ...(i === 0 ? { imageConfig: { aspectRatio: "16:9" } } : {}) },
      };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(55000),
      });
      if (!res.ok) continue; // thử model dự phòng
      const data = await res.json();
      const respParts = data?.candidates?.[0]?.content?.parts || [];
      const img = respParts.find((p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data);
      if (img?.inlineData?.data) return { data: img.inlineData.data as string, mime: (img.inlineData.mimeType as string) || "image/png" };
    } catch { /* thử model kế tiếp */ }
  }
  return null;
}

// Sinh tiêu đề + mô tả SEO tối ưu (tiếng Việt) cho 1 mục nội dung.
export async function generateSeoMeta(input: { name: string; context?: string }): Promise<{ seo_title: string; seo_description: string } | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const model = (await getConfig("gemini_model")) || "gemini-2.5-flash";
  const prompt = `Bạn là chuyên gia SEO tiếng Việt cho nền tảng học AI "VIE AI EDU". Tạo thẻ SEO tối ưu cho mục dưới đây để xếp hạng cao trên Google.

Tên: ${input.name}
${input.context ? `Bối cảnh: ${input.context}` : ""}

Yêu cầu:
- "seo_title": tiêu đề hấp dẫn, chứa từ khóa người Việt hay tìm, TỐI ĐA 60 ký tự, có thể kèm "| VIE AI EDU" nếu còn chỗ.
- "seo_description": mô tả lôi cuốn, kêu gọi nhấp, chứa từ khóa, 120–155 ký tự.
- Tiếng Việt tự nhiên, không nhồi nhét từ khóa.

Trả về JSON: {"seo_title": "...", "seo_description": "..."}`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const p = JSON.parse(text);
    if (!p.seo_title || !p.seo_description) return null;
    return { seo_title: String(p.seo_title).slice(0, 70), seo_description: String(p.seo_description).slice(0, 165) };
  } catch { return null; }
}

// Viết lại một tin AI sang tiếng Việt theo giọng VIE AI EDU (markdown).
export async function rewriteArticle(input: { title: string; summary: string; sourceName: string }): Promise<Rewritten | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const model = (await getConfig("gemini_model")) || "gemini-2.5-flash";
  const prompt = `Bạn là biên tập viên của VIE AI EDU — nền tảng học AI cho người Việt. Viết lại tin tức AI dưới đây thành một bài blog tiếng Việt hấp dẫn, dễ hiểu, chuẩn SEO, KHÔNG sao chép nguyên văn.

Tiêu đề gốc: ${input.title}
Tóm tắt nguồn (${input.sourceName}): ${input.summary}

Yêu cầu:
- BẮT BUỘC: "title", "excerpt" và "body" PHẢI hoàn toàn bằng TIẾNG VIỆT (dịch cả tên riêng/thuật ngữ khi tự nhiên, giữ tên sản phẩm gốc nếu cần). TUYỆT ĐỐI không để tiêu đề tiếng Anh.
- Tiêu đề tiếng Việt hấp dẫn, chuẩn SEO, tối đa ~70 ký tự.
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
