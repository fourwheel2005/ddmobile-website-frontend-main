"use client";
import Link from "next/link";
import Image from "next/image";
import { Scale, X, Smartphone } from "lucide-react";
import { useCompare, COMPARE_MAX } from "@/lib/useCompare";

/**
 * แถบลอยด้านล่าง แสดงสินค้าที่เลือกเปรียบเทียบ (S13/UX-03)
 * โชว์เมื่อเลือกอย่างน้อย 1 · ปุ่ม "เปรียบเทียบ" เปิดใช้เมื่อ ≥2 (เทียบตัวเดียวไม่มีความหมาย)
 */
export default function CompareBar({ catalog }: { catalog: Array<{ id: string; productName: string; imageUrl: string | null }> }) {
  const { ids, count, remove, clear } = useCompare();
  if (count === 0) return null;

  const chosen = ids.map((id) => catalog.find((c) => c.id === id)).filter(Boolean) as typeof catalog;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="container-dd flex items-center gap-3 py-3">
        <span className="hidden items-center gap-1.5 text-sm font-semibold text-text-heading sm:flex">
          <Scale size={16} className="text-yellow-hover" /> เปรียบเทียบ
        </span>

        <ul className="flex flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chosen.map((c) => (
            <li key={c.id} className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border-default bg-bg-subtle py-1 pl-1 pr-2">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white">
                {c.imageUrl ? <Image src={c.imageUrl} alt={c.productName} width={28} height={28} sizes="28px" className="h-full w-full object-contain p-0.5" /> : <Smartphone size={14} className="text-text-disabled" />}
              </span>
              <span className="max-w-[9rem] truncate text-xs font-medium text-text-heading">{c.productName}</span>
              <button onClick={() => remove(c.id)} aria-label={`เอา ${c.productName} ออกจากการเปรียบเทียบ`} className="rounded-full p-0.5 text-text-muted hover:text-text-heading">
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>

        <button onClick={clear} className="hidden flex-shrink-0 text-xs font-medium text-text-muted hover:text-text-heading sm:block">ล้าง</button>
        <Link
          href="/compare"
          aria-disabled={count < 2}
          onClick={(e) => { if (count < 2) e.preventDefault(); }}
          className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${count < 2 ? "cursor-not-allowed bg-bg-subtle text-text-disabled" : "bg-yellow text-on-yellow hover:bg-yellow-hover"}`}
        >
          เปรียบเทียบ ({count}/{COMPARE_MAX})
        </Link>
      </div>
    </div>
  );
}
