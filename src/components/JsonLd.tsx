// Nhúng dữ liệu có cấu trúc (Schema.org JSON-LD) cho SEO.
// Nhiều thực thể → bọc trong @graph (chuẩn Schema.org) để mọi parser đọc được @context ở cấp gốc.
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data.map((d) => { const { ["@context"]: _c, ...rest } = d as Record<string, unknown>; void _c; return rest; }) }
    : data;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }} />;
}
