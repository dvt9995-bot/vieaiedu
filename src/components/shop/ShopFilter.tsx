"use client";
import { useRouter } from "next/navigation";
import FilterMenu from "@/components/FilterMenu";

// Bộ lọc phễu cho /shop — đồng bộ với bộ lọc toàn hệ thống.
export default function ShopFilter({ cats, cat, type, sort }: { cats: { slug: string; name: string }[]; cat?: string; type?: string; sort?: string }) {
  const router = useRouter();
  const go = (next: { cat?: string; type?: string; sort?: string }) => {
    const p = new URLSearchParams();
    const c = next.cat ?? cat, t = next.type ?? type, s = next.sort ?? sort;
    if (c) p.set("cat", c);
    if (t && t !== "all") p.set("type", t);
    if (s && s !== "new") p.set("sort", s);
    router.push(`/shop${p.toString() ? `?${p}` : ""}`);
  };
  return (
    <FilterMenu
      groups={[
        { key: "cat", label: "Danh mục", value: cat || "", onChange: (v) => go({ cat: v }), options: [{ value: "", label: "Tất cả danh mục" }, ...cats.map((c) => ({ value: c.slug, label: c.name }))] },
        { key: "type", label: "Loại sản phẩm", value: type || "all", onChange: (v) => go({ type: v }), options: [{ value: "all", label: "Tất cả" }, { value: "digital", label: "Sản phẩm số" }, { value: "physical", label: "Vật lý" }] },
        { key: "sort", label: "Sắp xếp", value: sort || "new", onChange: (v) => go({ sort: v }), options: [{ value: "new", label: "Mới nhất" }, { value: "best", label: "Bán chạy" }, { value: "price_asc", label: "Giá thấp → cao" }, { value: "price_desc", label: "Giá cao → thấp" }] },
      ]}
    />
  );
}
