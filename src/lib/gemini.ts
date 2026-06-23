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

// Gọi Gemini text, trả chuỗi đã trim (dùng chung cho mô tả/làm đẹp)
async function geminiText(prompt: string, max = 2500): Promise<string | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const model = (await getConfig("gemini_model")) || "gemini-2.5-flash";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: Math.min(8192, Math.ceil(max / 2.5) + 512) } }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return String(text).trim().replace(/```\w*\n?|```/g, "").trim().slice(0, max);
  } catch { return null; }
}

const MD_RULE = `Định dạng Markdown rõ ràng, có cấu trúc, dễ đọc:
- Dùng tiêu đề phụ "## " cho mỗi phần (vd: ## Bạn sẽ học được gì, ## Phù hợp với ai, ## Vì sao nên học).
- Dùng gạch đầu dòng "- " cho các ý liệt kê; **in đậm** từ khóa quan trọng.
- Đoạn ngắn, xuống dòng hợp lý. KHÔNG dùng bảng, KHÔNG H1 (#), KHÔNG nhồi nhét.`;

// Gợi ý MÔ TẢ DÀI (chi tiết) cho khóa học — Markdown có cấu trúc
export async function suggestCourseDescription(title: string): Promise<string | null> {
  return geminiText(`Viết phần MÔ TẢ chi tiết, hấp dẫn cho khóa học AI tên "${title}" trên nền tảng VIE AI EDU.
Nội dung tiếng Việt, chuyên nghiệp, truyền cảm hứng, hướng đến chuyển đổi mua hàng. Bao gồm: khóa học dạy gì, học viên đạt được gì (lợi ích cụ thể), phù hợp với ai, vì sao nên học.
${MD_RULE}
Chỉ trả về nội dung Markdown, không lời dẫn.`, 7000);
}

// Chấm bài tập/dự án của học viên bằng AI → điểm 0-100 + nhận xét xây dựng (tiếng Việt)
export async function gradeAssignment(input: { courseTitle: string; brief: string; submission: string }): Promise<{ score: number; feedback: string; passed: boolean } | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const model = (await getConfig("gemini_model")) || "gemini-2.5-flash";
  const prompt = `Bạn là giảng viên AI giàu kinh nghiệm của VIE AI EDU, đang CHẤM bài tập/dự án thực hành của học viên một cách công tâm và mang tính xây dựng.

KHÓA HỌC: "${input.courseTitle}"
ĐỀ BÀI / YÊU CẦU:
"""
${input.brief.slice(0, 3000)}
"""
BÀI LÀM CỦA HỌC VIÊN:
"""
${input.submission.slice(0, 6000)}
"""

Hãy chấm theo các tiêu chí: mức độ đáp ứng yêu cầu đề bài, tính đúng/hợp lý, sự đầy đủ, và khả năng ứng dụng thực tế.
Nhận xét bằng TIẾNG VIỆT, chân thành, cụ thể: nêu điểm tốt, điểm cần cải thiện, và 1-2 gợi ý hành động. Khích lệ nhưng trung thực. Nếu bài quá sơ sài hoặc lạc đề thì cho điểm thấp và nói rõ vì sao.
Trả về JSON đúng định dạng: {"score": <số nguyên 0-100>, "feedback": "<nhận xét markdown ngắn gọn>", "passed": <true nếu score>=70>}`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.4 } }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const j = JSON.parse(text);
    const score = Math.max(0, Math.min(100, Math.round(Number(j.score) || 0)));
    return { score, feedback: String(j.feedback || "").slice(0, 2000), passed: score >= 70 };
  } catch { return null; }
}

// Làm đẹp / chuẩn hóa lại nội dung mô tả admin đã nhập → Markdown có cấu trúc, giữ nguyên ý
export async function beautifyCourseDescription(title: string, raw: string): Promise<string | null> {
  return geminiText(`Biên tập lại phần MÔ TẢ khóa học "${title}" dưới đây cho chuyên nghiệp, mạch lạc, dễ đọc và tăng trải nghiệm mua hàng.
QUAN TRỌNG: GIỮ NGUYÊN TOÀN BỘ nội dung và mọi chi tiết người dùng đã viết — KHÔNG được lược bỏ, KHÔNG tóm tắt, KHÔNG rút gọn ý. Chỉ định dạng lại: chia mục, thêm tiêu đề "## ", gạch đầu dòng, in đậm từ khóa, tách đoạn cho dễ đọc. Không bịa thêm thông tin sai.
${MD_RULE}

NỘI DUNG GỐC (giữ đầy đủ):
"""
${raw.slice(0, 12000)}
"""

Chỉ trả về nội dung Markdown đã biên tập (đầy đủ, không thiếu ý), không lời dẫn.`, 12000);
}

export type ImgRole = "product" | "person" | "platform";
export type ImgRef = { data: string; mime: string; role?: ImgRole };
export type CoverStyle = "modern" | "tech3d" | "gradient" | "photo" | "flat";

const STYLE_DIRECTION: Record<CoverStyle, string> = {
  modern: "STYLE: ultra-clean modern minimal — lots of negative space, refined geometry, subtle depth, restrained palette. Apple/Linear keynote aesthetic.",
  tech3d: "STYLE: premium 3D render — glossy/matte 3D objects, soft studio lighting, realistic materials, gentle reflections, depth of field. High-end tech product look.",
  gradient: "STYLE: modern vibrant gradient/glassmorphism — smooth color gradients, soft blur, glass panels, neon-soft glow, contemporary SaaS landing aesthetic (kept tasteful, not garish).",
  photo: "STYLE: cinematic realistic photography composite — photoreal scene/subject, natural lighting, shallow depth of field, editorial magazine quality.",
  flat: "STYLE: clean flat vector illustration — bold simple shapes, crisp edges, modern flat design, generous spacing, no heavy gradients.",
};

// Sinh ẢNH BÌA khóa học bằng Gemini (Nano Banana Pro). refs = ảnh tham chiếu có VAI TRÒ.
export async function generateCoverImage(title: string, refs: ImgRef[] = [], opts: { style?: CoverStyle; withText?: boolean } = {}): Promise<{ data: string; mime: string } | null> {
  const key = await getConfig("gemini_api_key", "GEMINI_API_KEY");
  if (!key) return null;
  const hasRefs = refs.length > 0;
  const style = opts.style || "modern";
  const withText = opts.withText !== false; // mặc định AI vẽ chữ; false = app tự thêm chữ

  // Mô tả vai trò từng ảnh tham chiếu theo đúng thứ tự gửi lên
  const refLines = refs.map((r, i) => {
    const n = i + 1;
    if (r.role === "person") return `• Reference image #${n} = a PERSON/instructor: make this exact person a clear figure in the cover.`;
    if (r.role === "platform") return `• Reference image #${n} = the PLATFORM logo (the school's own logo): place it SMALL and subtle in a top corner as a light watermark ONLY — it must NOT be the focus and must NOT be large.`;
    return `• Reference image #${n} = the COURSE PRODUCT logo (the AI tool being taught, e.g. Claude/ChatGPT/Gemini): reproduce it FAITHFULLY (exact shape, colors, proportions) and make it the LARGE CENTRAL HERO of the cover. Do NOT replace it with a generic glowing "AI" glyph, brain or text.`;
  }).join("\n");

  // Prompt cấp "senior graphic designer" — hiện đại, tinh tế, công nghệ cao, KHÔNG lòe loẹt.
  const prompt = `You are a WORLD-CLASS EXPERT DESIGNER specialized in marketing banners and online-course cover art (course thumbnails / hero banners). You have the visual polish of Apple, Stripe, Linear, Vercel and award-winning Behance/Dribbble work. Design a premium 16:9 widescreen online-course cover.

COURSE TOPIC (Vietnamese): "${title}".

FIDELITY TO THE BRIEF (critical):
- Study the attached reference image(s) and the course topic CAREFULLY, then design accordingly — the cover must clearly and accurately represent THIS specific course and its subject.
- Reproduce every provided reference FAITHFULLY: exact logo shapes/colors/proportions, and exact likeness of any provided person. Do not distort, recolor or invent brand marks.
- The artwork must be coherent with the topic's meaning (don't add unrelated objects). Make a viewer instantly understand what the course is about.

THUMBNAIL CRAFT:
- Must read clearly and look striking even at small sizes (as a thumbnail): bold focal point, strong figure/ground contrast, no tiny fussy details.
- Professional finish: pixel-clean edges, consistent lighting and perspective, harmonious color, no artefacts or warped shapes.

ART DIRECTION (very important):
- Modern, sleek, sophisticated, minimal and uncluttered. Strong visual hierarchy, one clear focal point, generous negative space, balanced layout using the rule of thirds.
- High-end tech aesthetic: clean geometry, refined 3D or crisp flat shapes, subtle depth, soft realistic studio lighting, gentle premium glow.
- STRICTLY AVOID: busy circuit-board/glowing-brain clichés, cheesy or gaudy "casino" gold gradients, clip-art, heavy bevels, overcrowding, low-end stock look. Keep it tasteful and restrained.

${STYLE_DIRECTION[style]}

HERO: the actual AI product taught in this course as the recognizable focal element (use its real brand identity and colors), placed off-center per the rule of thirds — never a generic "AI" glyph.

${withText
  ? `TYPOGRAPHY (designer-grade): render exactly ONE short Vietnamese headline, 2–4 words, correct diacritics (e.g. "Làm chủ Claude AI"), in a clean modern geometric sans-serif (Inter / SF Pro / Montserrat style), bold weight, tight kerning, crisp edges, excellent legibility and strong contrast with the background. Place it neatly in the top or left third with comfortable margins. No other text, no paragraphs, no small print, no misspelled or warped letters.`
  : `NO TEXT AT ALL — render only the visual artwork with NO words, letters or numbers. Leave clean, uncluttered NEGATIVE SPACE in the LEFT third of the frame so a title can be overlaid later. Compose the hero subject toward the right.`}

COLOR: refined and editorial — a clean deep background (midnight navy or charcoal, OR a crisp light surface) with crimson red (#E41E26) as a confident accent and gold (#F4B400) used sparingly as a premium highlight. Restrained, elegant, NOT a heavy red-gold gradient wash.

QUALITY: ultra-sharp, 4K, professional, cohesive, award-winning.
${hasRefs
  ? `\nREFERENCE IMAGES — ${refs.length} provided. Use EVERY one with its EXACT role below (never swap roles), integrated cleanly into the polished layout:\n${refLines}\nAdd no logo other than the provided ones. Besides the short headline, no other text.`
  : `\nNo logos. Besides the short headline, no other text or watermark.`}`;

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

Mục tiêu CHẤT LƯỢNG (chuẩn E-E-A-T của Google — tránh nội dung AI hời hợt bị phạt):
- KHÔNG viết lại hời hợt. Phải có GÓC NHÌN & PHÂN TÍCH RIÊNG của VIE AI EDU, đặt trong bối cảnh người Việt.
- BẮT BUỘC "title", "excerpt", "body" hoàn toàn bằng TIẾNG VIỆT (giữ tên sản phẩm gốc khi cần). Tuyệt đối không tiêu đề tiếng Anh.
- Tiêu đề hấp dẫn, chuẩn SEO, ~60–70 ký tự, không giật tít sai sự thật.
- Bài dài 600–900 từ, Markdown: 3–5 mục "## tiêu đề phụ", có gạch đầu dòng khi hợp lý.
- CẤU TRÚC bắt buộc gồm các phần (đặt tiêu đề phụ phù hợp): (1) Có gì mới / chuyện gì đang xảy ra; (2) **Vì sao điều này quan trọng** (phân tích, ý nghĩa); (3) **Ý nghĩa với người Việt / người học AI tại VN**; (4) **Bạn nên làm gì** (gợi ý ứng dụng/kỹ năng thực tế, có thể liên hệ học tập).
- Giọng chuyên gia, khách quan, gần gũi; có nhận định/đánh giá (experience + expertise), KHÔNG bịa số liệu cụ thể (số liệu/ngày tháng chỉ nêu nếu chắc chắn từ nguồn).
- Mở đầu bằng hook thật, kết bài gợi mở hành động.

Trả về JSON đúng định dạng: {"title": "tiêu đề tiếng Việt mới", "excerpt": "tóm tắt 1-2 câu súc tích", "body": "nội dung markdown chất lượng cao"}`;

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
