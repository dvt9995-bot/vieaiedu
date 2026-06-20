// Avatar dùng chung: hiện ảnh đại diện nếu có, nếu không thì chữ cái đầu trên nền màu ổn định.
// Là component thuần (không hook) nên dùng được cả server lẫn client.
const COLORS = ["#e41e26", "#202124", "#f4b400", "#1a73e8", "#0f9d58", "#9334e6"];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function Avatar({
  src, name = "?", size = 40, className = "",
}: { src?: string | null; name?: string; size?: number; className?: string }) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src} alt={name}
        className={`rounded-full object-cover shrink-0 bg-bg-soft ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`rounded-full inline-flex items-center justify-center font-bold text-white uppercase shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: colorFor(name) }}
    >
      {letter}
    </span>
  );
}
