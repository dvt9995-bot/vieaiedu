// Nguồn chân lý cho style nút toàn app. Server component dùng buttonClass() trên <Link>,
// client component dùng <Button> (components/ui/Button.tsx). KHÓA CỨNG đồng bộ ở đây.
export type ButtonVariant = "primary" | "secondary" | "dark" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

const BASE = "inline-flex items-center justify-center gap-2 rounded-full font-semibold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent hover:bg-accent-700 text-white",                                  // CTA chính (đỏ)
  secondary: "border border-border-strong text-ink-2 hover:border-accent hover:text-accent", // viền phụ
  dark: "bg-ink hover:opacity-90 text-white",                                           // nút đen nhấn
  ghost: "text-ink-2 hover:text-accent hover:bg-bg-soft",                               // chỉ chữ
  danger: "bg-accent-weak text-accent hover:bg-accent hover:text-white",               // hành động xóa/cảnh báo
  success: "bg-success hover:opacity-90 text-white",                                    // duyệt/đồng ý (xanh)
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-xs px-3.5 py-1.5",
  md: "text-sm px-4 py-2.5",
  lg: "text-base px-5 py-3",
};

export function buttonClass(opts: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  const { variant = "primary", size = "md", fullWidth, className = "" } = opts;
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? "w-full" : "", className].filter(Boolean).join(" ");
}
