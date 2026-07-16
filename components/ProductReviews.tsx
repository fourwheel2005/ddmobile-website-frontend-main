"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Star, ThumbsUp, BadgeCheck, Store, Loader2, Camera } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface Review {
  id: number; displayName: string; rating: number; comment: string | null;
  productName: string | null; variantLabel: string | null; images: string[];
  helpfulCount: number; votedByMe: boolean; adminReply: string | null;
  adminReplyAt: string | null; createdAt: string | null;
}
interface Data { average: number; count: number; histogram: Record<number, number>; reviews: Review[]; hasMore: boolean; }

const PAGE_SIZE = 5;
const SORTS = [
  { key: "RELEVANCE", label: "เกี่ยวข้องมากสุด" },
  { key: "NEWEST", label: "ล่าสุด" },
  { key: "RATING_DESC", label: "ดาวมาก → น้อย" },
  { key: "RATING_ASC", label: "ดาวน้อย → มาก" },
];

const Stars = ({ n, size = 14 }: { n: number; size?: number }) => (
  <span className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={size} className={i <= n ? "fill-yellow text-yellow" : "text-border-default"} />
    ))}
  </span>
);

const dateTh = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "";

/**
 * รีวิวใต้สินค้าแบบ Shopee/Lazada: สรุปเฉลี่ย + histogram + filter ดาว/มีรูป
 * + sort ตาม relevance + โหวตมีประโยชน์ + ร้านตอบกลับ · ทุกรีวิว = ผู้ซื้อจริง
 */
export default function ProductReviews({ productName }: { productName: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [items, setItems] = useState<Review[]>([]);
  const [star, setStar] = useState(0);
  const [withImages, setWithImages] = useState(false);
  const [sort, setSort] = useState("RELEVANCE");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const reqSeq = useRef(0);   // กัน response เก่ามาทับ (เปลี่ยน filter เร็ว ๆ ระหว่างโหลด)

  const load = useCallback(async (p: number, append: boolean) => {
    const seq = ++reqSeq.current;
    setLoading(true);
    try {
      const res = await api.get("/reviews/product", {
        params: { name: productName, star, withImages, sort, page: p, size: PAGE_SIZE },
      });
      if (seq !== reqSeq.current) return;   // มีคำขอใหม่กว่าแล้ว — ทิ้งผลนี้
      setData(res.data);
      setItems((prev) => (append ? [...prev, ...res.data.reviews] : res.data.reviews));
      setPage(p);
    } catch { /* ไม่มีรีวิว/โหลดพลาด → ซ่อน section */ }
    finally { if (seq === reqSeq.current) setLoading(false); }
  }, [productName, star, withImages, sort]);

  // lightbox: Esc ปิด + ล็อกสกอลล์พื้นหลัง
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [lightbox]);

  useEffect(() => { load(0, false); }, [load]);

  const vote = async (r: Review) => {
    if (!localStorage.getItem("token")) { toast("เข้าสู่ระบบเพื่อกดว่ารีวิวมีประโยชน์", { icon: "🔒" }); return; }
    try {
      const res = await api.post(`/reviews/${r.id}/helpful`);
      setItems((prev) => prev.map((x) => x.id === r.id ? { ...x, votedByMe: res.data.voted, helpfulCount: res.data.count } : x));
    } catch { toast.error("โหวตไม่สำเร็จ"); }
  };

  if (!data || data.count === 0) return null;   // ยังไม่มีรีวิวสินค้านี้ → ไม่โชว์ (ไม่มีของปลอม)

  const histTotal = Math.max(1, data.count);

  return (
    <div className="card-dd mt-8">
      <h2 className="flex items-center gap-2 font-bold text-text-heading">
        รีวิวจากผู้ซื้อจริง <span className="badge-dd badge-success"><BadgeCheck size={12} /> Verified</span>
      </h2>

      {/* สรุป: เฉลี่ยตัวใหญ่ + histogram แบบ Shopee */}
      <div className="mt-4 flex flex-col gap-5 sm:flex-row">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-bg-tinted px-8 py-4">
          <p className="font-display text-5xl font-bold text-text-heading">{data.average.toFixed(1)}</p>
          <Stars n={Math.round(data.average)} size={16} />
          <p className="mt-1 text-xs text-text-muted">{data.count.toLocaleString()} รีวิว</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((s) => {
            const c = data.histogram[s] ?? 0;
            return (
              <button key={s} onClick={() => setStar(star === s ? 0 : s)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors ${star === s ? "bg-yellow/15" : "hover:bg-bg-subtle"}`}>
                <span className="w-8 text-right font-medium text-text-body">{s} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-border-subtle">
                  <span className="block h-full rounded-full bg-yellow" style={{ width: `${(c / histTotal) * 100}%` }} />
                </span>
                <span className="w-8 tabular-nums text-text-muted">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* filter + sort */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        <button onClick={() => { setStar(0); setWithImages(false); }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${star === 0 && !withImages ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`}>
          ทั้งหมด ({data.count})
        </button>
        <button onClick={() => setWithImages((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${withImages ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`}>
          <Camera size={12} /> มีรูปภาพ
        </button>
        {star > 0 && <span className="badge-dd badge-warning">{star} ดาว</span>}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="เรียงรีวิว"
                className="input-dd ml-auto min-h-0 w-auto cursor-pointer py-1.5 text-xs">
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* รายการรีวิว */}
      <div className="mt-2 divide-y divide-border-subtle">
        {items.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-text-muted">ไม่มีรีวิวตามเงื่อนไขที่เลือก</p>
        )}
        {items.map((r) => (
          <div key={r.id} className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-text-heading">{r.displayName}
                  <span className="ml-2 inline-flex items-center gap-0.5 text-[11px] font-medium text-success-text"><BadgeCheck size={11} /> ซื้อจริง</span>
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Stars n={r.rating} />
                  <span className="text-[11px] text-text-muted">{dateTh(r.createdAt)}{r.variantLabel ? ` · ${r.variantLabel}` : ""}</span>
                </div>
              </div>
            </div>
            {r.comment && <p className="mt-2 text-sm leading-relaxed text-text-body">{r.comment}</p>}
            {r.images.length > 0 && (
              <div className="mt-2 flex gap-2">
                {r.images.map((src) => (
                  <button key={src} onClick={() => setLightbox(src)} className="h-20 w-20 overflow-hidden rounded-lg border border-border-default transition-transform hover:scale-105" aria-label="ขยายรูปรีวิว">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="รูปรีวิวจากลูกค้า" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {r.adminReply && (
              <div className="mt-3 rounded-xl bg-bg-tinted p-3">
                <p className="flex items-center gap-1 text-xs font-bold text-text-heading"><Store size={12} className="text-yellow-hover" /> การตอบกลับจากร้าน</p>
                <p className="mt-1 text-sm text-text-body">{r.adminReply}</p>
              </div>
            )}
            <button onClick={() => vote(r)}
                    className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${r.votedByMe ? "border-yellow bg-yellow/15 text-text-heading" : "border-border-default text-text-muted hover:border-yellow hover:text-text-heading"}`}>
              <ThumbsUp size={12} className={r.votedByMe ? "fill-yellow text-yellow-hover" : ""} /> มีประโยชน์ {r.helpfulCount > 0 && `(${r.helpfulCount})`}
            </button>
          </div>
        ))}
      </div>

      {loading && <div className="flex justify-center py-4 text-yellow-hover"><Loader2 size={22} className="animate-spin" /></div>}
      {!loading && data.hasMore && (
        <div className="border-t border-border-subtle pt-3 text-center">
          <button onClick={() => load(page + 1, true)} className="btn-ghost">ดูรีวิวเพิ่มเติม</button>
        </div>
      )}

      {/* lightbox รูปรีวิว */}
      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="รูปรีวิวขยาย">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="รูปรีวิว" className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
