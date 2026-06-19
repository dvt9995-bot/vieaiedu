/* Thẻ học viên (digital ID) theo mẫu bảng tên trong bộ nhận diện:
   dải đỏ + logo trên đầu, ảnh, tên, vai trò, mã học viên, QR. */
export default function StudentCard({
  name = "Nguyễn Văn An",
  studentId = "VIE-2026-0001",
  joined = "06/2026",
}: {
  name?: string;
  studentId?: string;
  joined?: string;
}) {
  return (
    <div className="w-[300px] max-w-full">
      {/* móc dây đeo */}
      <div className="mx-auto mb-[-6px] h-5 w-10 rounded-full border-[3px] border-accent bg-white relative z-10" />
      <div className="rounded-2xl overflow-hidden border border-border shadow-lg bg-surface">
        {/* dải đỏ + logo */}
        <div className="relative bg-accent h-24 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden>
            <g fill="none" stroke="#fff" strokeWidth="1">
              <circle cx="40" cy="48" r="40" /><circle cx="40" cy="48" r="26" />
              <path d="M180 30h30v8h-12v40" /><path d="M220 20h26v10h-10v30" />
            </g>
          </svg>
          <div className="relative font-display font-extrabold text-white text-xl tracking-tight">
            VIE AI EDU
          </div>
        </div>

        {/* ảnh */}
        <div className="flex justify-center -mt-10">
          <div className="w-20 h-20 rounded-full ring-4 ring-white bg-bg-soft flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 24 24" className="w-12 h-12 fill-ink-3/50"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.7-9 6v2h18v-2c0-3.3-4-6-9-6z" /></svg>
          </div>
        </div>

        <div className="px-5 pt-3 pb-5 text-center">
          <div className="font-bold text-lg">{name}</div>
          <div className="text-accent text-sm font-semibold">Học viên</div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-left">
            <div>
              <div className="text-ink-3 text-[.7rem] uppercase tracking-wide">Mã học viên</div>
              <div className="font-mono text-sm font-semibold">{studentId}</div>
            </div>
            <div>
              <div className="text-ink-3 text-[.7rem] uppercase tracking-wide">Tham gia</div>
              <div className="text-sm font-semibold">{joined}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            {/* QR cách điệu */}
            <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden>
              <rect width="40" height="40" rx="4" fill="#fff" stroke="#e7e9ee" />
              {[[4,4],[4,28],[28,4]].map(([x,y],i)=>(<g key={i}><rect x={x} y={y} width="8" height="8" fill="none" stroke="#202124" strokeWidth="2"/></g>))}
              {Array.from({length:18}).map((_,i)=>(<rect key={i} x={6+(i%6)*5} y={18+Math.floor(i/6)*5} width="3" height="3" fill={i%2?"#202124":"#e41e26"} opacity={(i*7)%3?1:0}/>))}
            </svg>
            <span className="text-ink-3 text-xs">vieaiedu.vn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
