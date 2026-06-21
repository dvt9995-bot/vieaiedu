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

// Gợi ý mô tả ngắn (subtitle) cho khóa học dựa trên tên.
export async function suggestCourseSubtitle(title: string): Promise<string | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const model = (await getConfig("gemini_model")) || "gemini-2.5-flash";
  const prompt = `Viết MỘT mô tả ngắn (subtitle) hấp dẫn, súc tích cho khóa học AI tên "${title}" trên nền tảng VIE AI EDU.
Yêu cầu: 1 câu tiếng Việt, 8–18 từ, nêu rõ lợi ích hoặc đối tượng học, lôi cuốn. Chỉ trả về đúng câu mô tả, không thêm dấu ngoặc, không giải thích.`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.85 } }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return String(text).trim().replace(/^["'“”]+|["'“”]+$/g, "").slice(0, 160);
  } catch { return null; }
}

export type ImgRole = "product" | "person" | "platform";
export type ImgRef = { data: string; mime: string; role?: ImgRole };

// Sinh ẢNH BÌA khóa học bằng Gemini (Nano Banana Pro). refs = ảnh tham chiếu có VAI TRÒ.
export async function generateCoverImage(title: string, refs: ImgRef[] = []): Promise<{ data: string; mime: string } | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const hasRefs = refs.length > 0;

  // Mô tả vai trò từng ảnh tham chiếu theo đúng thứ tự gửi lên
  const refLines = refs.map((r, i) => {
    const n = i + 1;
    if (r.role === "person") return `• Reference image #${n} = a PERSON/instructor: make this exact person a clear figure in the cover.`;
    if (r.role === "platform") return `• Reference image #${n} = the PLATFORM logo (the school's own logo): place it SMALL and subtle in a top corner as a light watermark ONLY — it must NOT be the focus and must NOT be large.`;
    return `• Reference image #${n} = the COURSE PRODUCT logo (the AI tool being taught, e.g. Claude/ChatGPT/Gemini): reproduce it FAITHFULLY (exact shape, colors, proportions) and make it the LARGE CENTRAL HERO of the cover. Do NOT replace it with a generic glowing "AI" glyph, brain or text.`;
  }).join("\n");

  // Bìa khóa học: CHỦ THỂ = LOGO SẢN PHẨM được dạy; tiêu đề NGẮN GỌN; đỏ #E41E26 + vàng #F4B400 làm khung accent.
  const prompt = `Premium, editorial, eye-catching widescreen 16:9 online course cover banner. Bold, modern, scroll-stopping — like a top-tier tech course thumbnail. Avoid generic stock "circuit board + glowing brain" clichés.
Course topic (Vietnamese): "${title}".
HERO SUBJECT: the actual AI PRODUCT taught in this course (its real logo / brand identity) must be the large, recognizable centerpiece — keep that product's authentic look and colors. Do NOT substitute a generic "AI" symbol.
HEADLINE TEXT: render exactly ONE short punchy Vietnamese headline, 2–4 words, correct spelling & diacritics, in large bold stylish typography (e.g. "Làm chủ Claude AI"). No full sentence, no small print, no other text.
Composition: one clear focal point, clean, premium, depth, soft cinematic lighting. Crimson red (#E41E26) + warm gold (#F4B400) as accent/frame palette over an elegant deep gradient — but the product's own brand colors take priority on its logo.
${hasRefs
  ? `REFERENCE IMAGES — ${refs.length} provided, you MUST use EVERY one with its exact role below (do not ignore or swap roles):\n${refLines}\nCombine them into one cohesive cover. Add no logo other than the provided ones. Besides the short headline, no other text.`
  : `No logos. Besides the short headline, no other text or watermark.`}`;

  const parts: Record<string, unknown>[] = [
    ...refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.data } })),
    { text: prompt },
  ];

  const models = [(await getConfig("gemini_image_model")) || "gemini-3-pro-image", "gemini-3-pro-image-preview", "gemini-2.5-flash-image"];
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
