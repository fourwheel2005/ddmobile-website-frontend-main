"use client";
/* eslint-disable @next/next/no-img-element -- รูปปก/รูปสินค้ามาจาก backend (ย่อแล้ว) */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX, X, ShoppingBag, Smartphone } from "lucide-react";
import { baht } from "@/lib/money";
import { formatDuration } from "@/lib/videoCompress";
import { clipStateLabel, resolveClipProduct, type ClipCatalogItem, type ProductClip, type ResolvedClipProduct } from "@/lib/productClips";

/** ไม่เล่นอัตโนมัติเมื่อผู้ใช้ขอลดการเคลื่อนไหว หรือเปิดโหมดประหยัดเน็ต */
function autoplayAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !conn?.saveData;
}

/**
 * แถวคลิปแนวตั้ง (shoppable video) — เลื่อนซ้าย-ขวา · เล่นแบบปิดเสียงเฉพาะคลิปที่อยู่กลางจอทีละคลิป
 * (คลิปอื่นโหลดแค่รูปปก — ไม่กินเน็ตลูกค้า) · แตะคลิป = เปิดเต็มจอพร้อมเสียง + รายการสินค้าในคลิป
 */
export default function ClipRail({ clips, catalog }: { clips: ProductClip[]; catalog: ClipCatalogItem[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  // ค่าฝั่งเซิร์ฟเวอร์ = false ก็ไม่ทำให้ hydrate ไม่ตรง — ใช้แค่เปิด/ปิดตัวจับการมองเห็น ไม่ได้เปลี่ยน DOM ตอนแรก
  const [canAuto] = useState(autoplayAllowed);
  const ratios = useRef(new Map<number, number>());

  // คลิปที่ "เห็นมากที่สุด" (≥ 60%) ได้เล่น — คลิปเดียวต่อครั้ง
  useEffect(() => {
    const root = rail.current;
    if (!root || !canAuto) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) ratios.current.set(Number((e.target as HTMLElement).dataset.i), e.intersectionRatio);
      let best: number | null = null, bestRatio = 0.6;
      ratios.current.forEach((r, i) => { if (r >= bestRatio) { best = i; bestRatio = r; } });
      setActive(best);
    }, { threshold: [0, 0.6, 0.8, 1] });
    root.querySelectorAll<HTMLElement>("[data-i]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [canAuto, clips.length]);

  const scroll = (dir: -1 | 1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      <div ref={rail} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {clips.map((c, i) => (
          <ClipCard key={c.id} index={i} clip={c} catalog={catalog} playing={open === null && active === i} onOpen={() => setOpen(i)} />
        ))}
      </div>
      {clips.length > 4 && (
        <>
          <button type="button" onClick={() => scroll(-1)} aria-label="คลิปก่อนหน้า"
                  className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-white shadow-md hover:bg-bg-subtle lg:flex">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="คลิปถัดไป"
                  className="absolute -right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-default bg-white shadow-md hover:bg-bg-subtle lg:flex">
            <ChevronRight size={20} />
          </button>
        </>
      )}
      {open !== null && <ClipViewer clips={clips} catalog={catalog} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ClipCard({ clip, catalog, index, playing, onOpen }: {
  clip: ProductClip; catalog: ClipCatalogItem[]; index: number; playing: boolean; onOpen: () => void;
}) {
  const products = useMemo(() => clip.products.map((p) => resolveClipProduct(p, catalog)), [clip.products, catalog]);
  const first = products[0];
  return (
    <article data-i={index} className="relative aspect-[9/16] w-[44vw] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-text-heading shadow-sm sm:w-[200px] lg:w-[220px]">
      <button type="button" onClick={onOpen} aria-label={`เล่นคลิป${clip.title ? ` ${clip.title}` : ""}`} className="absolute inset-0 block h-full w-full">
        <img src={clip.posterUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {playing && (
          <video src={clip.videoUrl} poster={clip.posterUrl} muted playsInline loop autoPlay preload="auto"
                 className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
        )}
        <span className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 to-transparent" />
        {!playing && (
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm">
            <Play size={22} className="ml-0.5 fill-white" />
          </span>
        )}
      </button>
      <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
        {formatDuration(clip.durationMs)}
      </span>
      {clip.title && (
        <p className="pointer-events-none absolute inset-x-2.5 top-9 line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow">{clip.title}</p>
      )}
      {first && (
        <Link href={first.href} className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-xl bg-white/95 p-1.5 pr-2 shadow-md backdrop-blur hover:bg-white">
          <ProductThumb p={first} size="h-10 w-10" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-text-heading">{first.name}</span>
            <span className="block text-xs font-bold text-price">{first.price != null ? baht(first.price) : clipStateLabel(first.state) ?? "ดูรายละเอียด"}</span>
          </span>
          {products.length > 1
            ? <span className="rounded-full bg-yellow px-1.5 py-0.5 text-[10px] font-bold text-text-heading">+{products.length - 1}</span>
            : <ChevronRight size={16} className="shrink-0 text-text-muted" />}
        </Link>
      )}
    </article>
  );
}

function ProductThumb({ p, size }: { p: ResolvedClipProduct; size: string }) {
  return p.imageUrl
    ? <img src={p.imageUrl} alt="" loading="lazy" className={`${size} shrink-0 rounded-lg bg-bg-subtle object-contain`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-text-disabled`}><Smartphone size={18} /></span>;
}

/** เต็มจอ: เสียงเปิด · แตะ = หยุด/เล่น · ปัดขึ้น-ลง หรือปุ่มลูกศร = คลิปถัดไป · รายการสินค้าในคลิป */
function ClipViewer({ clips, catalog, index, onIndex, onClose }: {
  clips: ProductClip[]; catalog: ClipCatalogItem[]; index: number; onIndex: (i: number) => void; onClose: () => void;
}) {
  const clip = clips[index];
  const video = useRef<HTMLVideoElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touchY = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const products = useMemo(() => clip.products.map((p) => resolveClipProduct(p, catalog)), [clip.products, catalog]);

  const go = useCallback((d: -1 | 1) => {
    const j = index + d;
    if (j >= 0 && j < clips.length) onIndex(j);
  }, [index, clips.length, onIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [go, onClose]);

  // เปลี่ยนคลิป → เริ่มเล่นใหม่ · เบราว์เซอร์ไม่ยอมเล่นพร้อมเสียง → เล่นแบบปิดเสียงแทน (แตะปุ่มลำโพงเปิดเสียงได้)
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    setProgress(0);
    setPaused(false);
    v.muted = muted;
    v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => setPaused(true)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- เริ่มเล่นใหม่เฉพาะตอนเปลี่ยนคลิป
  }, [clip.id]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); } else { v.pause(); setPaused(true); }
  };

  const productList = (
    <ul className="space-y-2">
      {products.map((p) => {
        const label = clipStateLabel(p.state);
        return (
          <li key={p.key}>
            <Link href={p.href} onClick={onClose} className="flex items-center gap-3 rounded-xl border border-border-default bg-white p-2 hover:border-yellow">
              <ProductThumb p={p} size="h-14 w-14" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-semibold text-text-heading">{p.name}</span>
                {p.spec && <span className="line-clamp-1 text-xs text-text-muted">{p.spec}</span>}
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {p.price != null && <span className="text-sm font-bold text-price">{baht(p.price)}</span>}
                  {label && <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-semibold text-text-muted">{label}</span>}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-yellow px-3 py-1.5 text-xs font-bold text-text-heading">ดูเครื่อง</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  // portal ไปที่ body: ไม่ติด stacking context ของ section ที่ครอบ · z สูงกว่าแถบเมนูล่างมือถือ (.mobile-nav = 200)
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={clip.title ?? "คลิปสินค้า"} className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 md:gap-6 md:p-6"
         onClick={onClose}>
      <div className="relative h-[100dvh] w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-black md:h-[90vh] md:max-w-[calc(90vh*9/16)] md:rounded-2xl"
           onClick={(e) => e.stopPropagation()}
           onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
           onTouchEnd={(e) => {
             if (touchY.current == null) return;
             const dy = e.changedTouches[0].clientY - touchY.current;
             touchY.current = null;
             if (Math.abs(dy) > 60) go(dy < 0 ? 1 : -1);
           }}>
        <video key={clip.id} ref={video} src={clip.videoUrl} poster={clip.posterUrl} playsInline loop preload="auto"
               onClick={toggle} onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
               className="h-full w-full cursor-pointer object-contain" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-3 top-3 h-1 overflow-hidden rounded-full bg-white/25">
          <div className="h-full bg-white transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="absolute inset-x-3 top-6 flex items-start gap-2">
          <p className="line-clamp-2 flex-1 pt-1 text-sm font-bold text-white drop-shadow">{clip.title}</p>
          <button type="button" onClick={() => { const v = video.current; if (v) { v.muted = !muted; setMuted(!muted); } }}
                  aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="ปิด"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60">
            <X size={20} />
          </button>
        </div>
        {paused && (
          <button type="button" onClick={toggle} aria-label="เล่นต่อ"
                  className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
            <Play size={30} className="ml-1 fill-white" />
          </button>
        )}
        {/* มือถือ: สินค้าในคลิปซ้อนด้านล่าง */}
        {products.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 max-h-[45%] overflow-y-auto bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 pt-10 md:hidden">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/90"><ShoppingBag size={14} /> สินค้าในคลิป</p>
            {productList}
          </div>
        )}
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-2 md:hidden">
          {index > 0 && <button type="button" onClick={() => go(-1)} aria-label="คลิปก่อนหน้า" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white"><ChevronLeft size={20} className="rotate-90" /></button>}
          {index < clips.length - 1 && <button type="button" onClick={() => go(1)} aria-label="คลิปถัดไป" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white"><ChevronRight size={20} className="rotate-90" /></button>}
        </div>
      </div>

      {/* เดสก์ท็อป: ลูกศร + รายการสินค้าด้านข้าง */}
      <div className="hidden w-80 flex-col gap-3 self-center md:flex" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="คลิปก่อนหน้า"
                  className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-white/10 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-30">
            <ChevronLeft size={18} /> ก่อนหน้า
          </button>
          <button type="button" onClick={() => go(1)} disabled={index === clips.length - 1} aria-label="คลิปถัดไป"
                  className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-white/10 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-30">
            ถัดไป <ChevronRight size={18} />
          </button>
        </div>
        <p className="text-center text-xs tabular-nums text-white/60">{index + 1} / {clips.length}</p>
        {products.length > 0 && (
          <div className="rounded-2xl bg-white p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text-heading"><ShoppingBag size={16} className="text-yellow-hover" /> สินค้าในคลิป</p>
            {productList}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
