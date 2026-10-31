"use client";
/* eslint-disable @next/next/no-img-element -- รูปรีวิวจาก backend */
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Camera, Loader2, MessageSquareQuote, Scale, Star, Store } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { channelLabel, type PublicReview, type StoreReviews as Data } from "@/lib/reviews";
import ReviewCard, { Stars } from "@/components/reviews/ReviewCard";

const PAGE_SIZE = 10;
const SORTS = [
  { key: "RELEVANCE", label: "เกี่ยวข้องมากสุด" },
  { key: "NEWEST", label: "ล่าสุด" },
  { key: "RATING_DESC", label: "ดาวมาก → น้อย" },
  { key: "RATING_ASC", label: "ดาวน้อย → มาก" },
];

/** สามข้อที่ทำให้คะแนนนี้เชื่อถือได้ — ต้องเป็นจริงตามระบบเสมอ (ห้ามเขียนเกินจริง) */
const TRUST = [
  { icon: BadgeCheck, title: "รีวิวจากผู้ซื้อจริงเท่านั้น", desc: "จากคำสั่งซื้อบนเว็บที่รับของแล้ว หรือลิงก์ส่วนตัวที่ร้านส่งให้หลังขาย ใช้ได้ 1 ครั้ง" },
  { icon: Scale, title: "แสดงทุกระดับคะแนน", desc: "ไม่คัดเฉพาะรีวิวดี · ลบเฉพาะข้อความไม่สุภาพหรือข้อมูลส่วนตัว" },
  { icon: Store, title: "บอกช่องทางที่ซื้อ", desc: "ทุกรีวิวระบุว่าซื้อผ่านเว็บไซต์ หน้าร้าน หรือโซเชียลของร้าน" },
];

const chip = (active: boolean) =>
  `inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`;

/**
 * รีวิวทั้งร้าน: สรุปคะแนน (ซ้าย) | สัดส่วนดาว (ขวา) · เหตุผลที่เชื่อถือได้ 3 ช่องเท่ากัน · ตัวกรอง · การ์ด 2 คอลัมน์
 * pinned = รีวิวที่ผู้ใช้เพิ่งส่งจากลิงก์ขอรีวิว (ปักไว้บนสุด ไม่ซ้ำในรายการ)
 */
export default function StoreReviews({ pinned }: { pinned?: PublicReview | null }) {
  const [data, setData] = useState<Data | null>(null);
  const [items, setItems] = useState<PublicReview[]>([]);
  const [star, setStar] = useState(0);
  const [withImages, setWithImages] = useState(false);
  const [channel, setChannel] = useState("");
  const [sort, setSort] = useState("RELEVANCE");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const seq = useRef(0);   // กันผลเก่ามาทับ (เปลี่ยนตัวกรองเร็ว ๆ)

  const load = useCallback(async (p: number, append: boolean) => {
    const mine = ++seq.current;
    setLoading(true);
    try {
      const res = await api.get<Data>("/reviews/store", {
        params: { star, withImages, sort, page: p, size: PAGE_SIZE, ...(channel ? { channel } : {}) },
      });
      if (mine !== seq.current) return;
      setData(res.data);
      setItems((prev) => (append ? [...prev, ...res.data.reviews] : res.data.reviews));
      setPage(p);
      setFailed(false);
    } catch {
      if (mine === seq.current) setFailed(true);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [star, withImages, channel, sort]);

  useEffect(() => { load(0, false); }, [load]);

  useEscapeKey(!!lightbox, () => setLightbox(null));
  useEffect(() => {
    if (!lightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [lightbox]);

  const vote = async (r: PublicReview) => {
    if (!localStorage.getItem("token")) { toast("เข้าสู่ระบบเพื่อกดว่ารีวิวมีประโยชน์", { icon: "🔒" }); return; }
    try {
      const res = await api.post(`/reviews/${r.id}/helpful`);
      setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, votedByMe: res.data.voted, helpfulCount: res.data.count } : x)));
    } catch { toast.error("โหวตไม่สำเร็จ"); }
  };

  const resetFilters = () => { setStar(0); setWithImages(false); setChannel(""); };
  const filtered = star > 0 || withImages || !!channel;
  const list = pinned ? items.filter((r) => r.id !== pinned.id) : items;
  const total = Math.max(1, data?.count ?? 0);
  const channels = Object.entries(data?.channels ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);

  if (!data) {
    return failed
      ? <p className="rounded-2xl border border-border-default bg-white p-8 text-center text-sm text-text-muted">โหลดรีวิวไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</p>
      : <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* สรุป: คะแนนรวม | สัดส่วนดาว — สองฝั่งกว้างเท่ากัน */}
      <section className="grid overflow-hidden rounded-3xl border border-border-default bg-white md:grid-cols-2">
        <div className="flex flex-col items-center justify-center gap-1 bg-bg-tinted px-6 py-8 text-center">
          <p className="text-sm font-semibold text-yellow-text">คะแนนเฉลี่ยจากลูกค้า</p>
          <p className="font-display text-6xl font-bold leading-none text-text-heading">{data.count > 0 ? data.average.toFixed(1) : "–"}</p>
          <Stars n={Math.round(data.average)} size={20} className="mt-1" />
          <p className="mt-1 text-sm text-text-muted">จาก {data.count.toLocaleString()} รีวิว{data.withImages > 0 ? ` · มีรูป ${data.withImages.toLocaleString()}` : ""}</p>
        </div>
        <div className="flex flex-col justify-center gap-1.5 px-6 py-6">
          {[5, 4, 3, 2, 1].map((s) => {
            const c = data.histogram[s] ?? 0;
            return (
              <button key={s} type="button" onClick={() => setStar(star === s ? 0 : s)} aria-pressed={star === s}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${star === s ? "bg-yellow/15" : "hover:bg-bg-subtle"}`}>
                <span className="flex w-10 items-center justify-end gap-1 font-medium text-text-body">{s} <Star size={12} className="fill-yellow text-yellow" /></span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-border-subtle">
                  <span className="block h-full rounded-full bg-yellow transition-[width] duration-500" style={{ width: `${(c / total) * 100}%` }} />
                </span>
                <span className="w-10 text-left tabular-nums text-text-muted">{c.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ทำไมเชื่อถือได้ — 3 ช่องเท่ากัน */}
      <section className="grid gap-3 sm:grid-cols-3">
        {TRUST.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center rounded-2xl border border-border-default bg-white px-4 py-5 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success-text"><Icon size={20} /></span>
            <p className="mt-2.5 text-sm font-bold text-text-heading">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">{desc}</p>
          </div>
        ))}
      </section>

      {pinned && (
        <section>
          <p className="section-label">รีวิวของคุณ</p>
          <ReviewCard review={pinned} onImage={setLightbox} highlight />
        </section>
      )}

      {/* ตัวกรอง */}
      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-default bg-white p-3">
        <button type="button" onClick={resetFilters} className={chip(!filtered)}>ทั้งหมด ({data.count.toLocaleString()})</button>
        {data.withImages > 0 && (
          <button type="button" onClick={() => setWithImages((v) => !v)} className={chip(withImages)}><Camera size={12} /> มีรูป</button>
        )}
        {channels.length > 1 && channels.map(([code, n]) => (
          <button key={code} type="button" onClick={() => setChannel(channel === code ? "" : code)} className={chip(channel === code)}>
            {channelLabel(code)} ({n.toLocaleString()})
          </button>
        ))}
        {star > 0 && (
          <button type="button" onClick={() => setStar(0)} className="badge-dd badge-warning" aria-label="ล้างตัวกรองดาว">{star} ดาว ✕</button>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="เรียงรีวิว"
                className="input-dd ml-auto min-h-0 w-auto cursor-pointer py-1.5 text-xs">
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </section>

      {/* รายการ */}
      {data.count === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border-default bg-white px-6 py-14 text-center">
          <MessageSquareQuote size={40} className="text-text-disabled" />
          <p className="mt-3 font-bold text-text-heading">ยังไม่มีรีวิว</p>
          <p className="mt-1 max-w-sm text-sm text-text-muted">รีวิวจะขึ้นที่นี่เมื่อลูกค้าที่ซื้อจริงให้คะแนน — ทุกรีวิวแสดงตามจริง</p>
        </div>
      ) : list.length === 0 && !loading ? (
        <p className="rounded-2xl border border-border-default bg-white p-8 text-center text-sm text-text-muted">
          ไม่มีรีวิวตามตัวกรองนี้ · <button type="button" onClick={resetFilters} className="font-semibold text-text-heading underline">ดูทั้งหมด</button>
        </p>
      ) : (
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          {list.map((r) => <ReviewCard key={r.id} review={r} onVote={vote} onImage={setLightbox} />)}
        </div>
      )}

      {loading && <div className="flex justify-center py-2 text-yellow-hover"><Loader2 size={22} className="animate-spin" /></div>}
      {!loading && data.hasMore && (
        <div className="text-center">
          <button type="button" onClick={() => load(page + 1, true)} className="btn-ghost">ดูรีวิวเพิ่มเติม</button>
        </div>
      )}

      {lightbox && (
        <div className="modal-backdrop" onClick={() => setLightbox(null)} role="dialog" aria-modal="true" aria-label="รูปรีวิวขยาย">
          <img src={lightbox} alt="รูปรีวิว" className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
