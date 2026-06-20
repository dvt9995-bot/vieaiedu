// Markdown rút gọn → HTML (heading, bold, italic, list, link, hr, đoạn văn).
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inline(s: string) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function figure(src: string) {
  return `<figure class="my-6"><img src="${src}" alt="" loading="lazy" class="mx-auto rounded-card border border-border max-h-[360px] w-auto max-w-full object-contain" /></figure>`;
}

// md → HTML. Nếu truyền images, ảnh được CHÈN XEN KẼ trong bài (trước mỗi mục ## từ mục thứ 2,
// rồi rải sau các đoạn văn) — không gom thành gallery riêng.
export function mdToHtml(md: string, images: string[] = []): string {
  const lines = (md || "").replace(/\r/g, "").split("\n");
  const out: string[] = [];
  const imgs = [...images];
  let inList = false;
  let h2seen = 0;
  let paraSinceImg = 0;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (/^---+$/.test(line)) { closeList(); out.push('<hr class="my-6 border-border" />'); continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      closeList();
      const lvl = m[1].length;
      // Chèn 1 ảnh trước mỗi mục ## (từ mục thứ 2) để minh họa theo nội dung
      if (lvl <= 2) { h2seen++; if (h2seen >= 2 && imgs.length) { out.push(figure(imgs.shift()!)); paraSinceImg = 0; } }
      const cls = lvl <= 2 ? "text-xl font-bold text-ink mt-6 mb-2" : "text-lg font-semibold text-ink mt-4 mb-2";
      out.push(`<h${lvl} class="${cls}">${inline(m[2])}</h${lvl}>`);
    } else if ((m = line.match(/^[-*]\s+(.*)$/))) {
      if (!inList) { out.push('<ul class="list-disc pl-5 space-y-1 my-3">'); inList = true; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      out.push(`<p class="my-3">${inline(line)}</p>`);
      // Rải ảnh còn lại sau mỗi 2 đoạn văn (tránh dồn cuối bài)
      paraSinceImg++;
      if (paraSinceImg >= 2 && imgs.length) { out.push(figure(imgs.shift()!)); paraSinceImg = 0; }
    }
  }
  closeList();
  // Ảnh dư (hiếm) chèn nốt vào cuối phần thân
  while (imgs.length) out.push(figure(imgs.shift()!));
  return out.join("\n");
}
