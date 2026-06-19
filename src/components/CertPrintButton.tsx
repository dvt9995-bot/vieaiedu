"use client";
export default function CertPrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-full bg-accent hover:bg-accent-700 text-white font-semibold px-6 py-3 cursor-pointer transition-colors">
      ⬇ Tải PDF
    </button>
  );
}
