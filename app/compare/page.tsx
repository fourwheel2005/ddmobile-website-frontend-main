"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { useCompare } from "@/lib/useCompare";
import { baht } from "@/lib/money";
import { gradeDescription } from "@/lib/gradeInfo";
import { stockImageLoader, IMAGE_BLUR_DATA_URL } from "@/lib/imageLoader";
import { ArrowLeft, Scale, Smartphone, X, Loader2 } from "lucide-react";

interface CmpItem {
  id: string;
  type: string;
  productName: string;
  conditionLabel: string;
  category: string;
  color: string | null;
  storage: string | null;
  minPrice: number | null;
  imageUrl: string | null;
  grade: string | null;
  avgBatteryHealth: number | null;
  warrantyExpire: string | null;
  stockState?: string | null;
  photoCount?: number | null;
}

const UNSPEC = <span className="text-text-disabled">ยังไม่ได้ระบุ</span>;
const dateTh = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

// แถวคุณสมบัติที่ normalize แล้วเท่านั้น (ไม่เทียบ field ที่ยังดิบ) — value ว่าง = "ยังไม่ได้ระบุ"
const ATTRS: { label: string; render: (it: CmpItem) => React.ReactNode }[] = [
  { label: "ราคา", render: (it) => <span className="font-bold text-price">{baht(it.minPrice, "สอบถามราคา")}</span> },
  { label: "สภาพ", render: (it) => it.conditionLabel },
  { label: "หมวดหมู่", render: (it) => it.category || UNSPEC },
  { label: "ความจุ", render: (it) => it.storage || UNSPEC },
  { label: "สี", render: (it) => it.color || UNSPEC },
  { label: "เกรดสภาพ", render: (it) => (it.grade ? <span title={gradeDescription(it.grade) ?? undefined}>เกรด {it.grade}</span> : UNSPEC) },
  { label: "แบตเตอรี่", render: (it) => (it.avgBatteryHealth != null ? `${it.avgBatteryHealth}%` : UNSPEC) },
  { label: "ประกันถึง", render: (it) => dateTh(it.warrantyExpire) || UNSPEC },
  { label: "รูปจริง", render: (it) => (it.photoCount != null && it.photoCount > 0 ? `${it.photoCount} รูป` : UNSPEC) },
  { label: "สถานะ", render: (it) => (it.stockState === "SOLD" ? "ขายแล้ว" : it.stockState === "AVAILABLE" ? "พร้อมขาย" : UNSPEC) },
];

export default function ComparePage() {
  const router = useRouter();
  const { ids, remove, clear } = useCompare();
  const [catalog, setCatalog] = useState<CmpItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCatalog<CmpItem>().then((c) => setCatalog(c)).catch(() => setCatalog([])).finally(() => setLoading(false));
  }, []);

  const items = ids.map((id) => catalog.find((c) => c.id === id)).filter(Boolean) as CmpItem[];

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">
        <button onClick={() => router.back()} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-heading">
          <ArrowLeft size={18} /> กลับไปเลือกสินค้าต่อ
        </button>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-heading md:text-3xl">
            <Scale size={26} className="text-yellow-hover" /> เปรียบเทียบสินค้า
          </h1>
          {items.length > 0 && <button onClick={clear} className="text-sm font-medium text-text-muted hover:text-text-heading">ล้างทั้งหมด</button>}
        </div>

        {loading ? (
          <div className="flex justify-center py-24 text-yellow-hover"><Loader2 size={36} className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-24 text-center">
            <Smartphone size={44} className="mx-auto mb-3 text-text-disabled" />
            <h2 className="text-lg font-bold text-text-heading">ยังไม่ได้เลือกสินค้าเปรียบเทียบ</h2>
            <p className="mt-1 text-sm text-text-muted">เลือกสินค้า 2–3 รายการจากหน้ารวมสินค้า แล้วกดเปรียบเทียบ</p>
            <Link href="/products" className="btn-primary mt-5 inline-flex">ไปเลือกสินค้า</Link>
          </div>
        ) : (
          <>
            {/* เดสก์ท็อป: ตาราง (แถว=คุณสมบัติ, คอลัมน์=สินค้า) */}
            <div className="hidden overflow-x-auto rounded-2xl border border-border-default bg-white md:block">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">ตารางเปรียบเทียบคุณสมบัติสินค้า</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-32 border-b border-border-default p-3 text-left text-text-muted">คุณสมบัติ</th>
                    {items.map((it) => (
                      <th key={it.id} scope="col" className="border-b border-l border-border-default p-3 align-top">
                        <div className="flex flex-col items-center gap-2 text-center">
                          <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-bg-subtle">
                            {it.imageUrl ? <Image src={it.imageUrl} alt={it.productName} fill loader={stockImageLoader} placeholder="blur" blurDataURL={IMAGE_BLUR_DATA_URL} sizes="96px" className="object-contain p-1" /> : <Smartphone size={32} className="text-text-disabled" />}
                          </span>
                          <span className="line-clamp-2 font-semibold text-text-heading">{it.productName}</span>
                          <button onClick={() => remove(it.id)} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-error-text">
                            <X size={12} /> เอาออก
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ATTRS.map((a) => (
                    <tr key={a.label} className="even:bg-bg-subtle/50">
                      <th scope="row" className="border-b border-border-subtle p-3 text-left font-medium text-text-muted">{a.label}</th>
                      {items.map((it) => (
                        <td key={it.id} className="border-b border-l border-border-subtle p-3 text-center text-text-heading">{a.render(it)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="p-3 text-left font-medium text-text-muted">ดูสินค้า</th>
                    {items.map((it) => (
                      <td key={it.id} className="border-l border-border-subtle p-3 text-center">
                        <Link href={`/products/${encodeURIComponent(it.id)}`} className="btn-primary inline-flex px-4 py-2 text-xs">ดูรายละเอียด</Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* มือถือ: การ์ดซ้อน (stacked) — ตารางแนวนอนอ่านยากบนจอเล็ก */}
            <div className="space-y-4 md:hidden">
              {items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-border-default bg-white p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg-subtle">
                      {it.imageUrl ? <Image src={it.imageUrl} alt={it.productName} fill loader={stockImageLoader} placeholder="blur" blurDataURL={IMAGE_BLUR_DATA_URL} sizes="64px" className="object-contain p-1" /> : <Smartphone size={26} className="text-text-disabled" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold text-text-heading">{it.productName}</p>
                      <button onClick={() => remove(it.id)} className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-muted hover:text-error-text"><X size={12} /> เอาออก</button>
                    </div>
                  </div>
                  <dl className="divide-y divide-border-subtle">
                    {ATTRS.map((a) => (
                      <div key={a.label} className="grid grid-cols-2 gap-2 py-1.5">
                        <dt className="text-text-muted">{a.label}</dt>
                        <dd className="text-right text-text-heading">{a.render(it)}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link href={`/products/${encodeURIComponent(it.id)}`} className="btn-primary mt-3 flex w-full justify-center py-2 text-sm">ดูรายละเอียด</Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
