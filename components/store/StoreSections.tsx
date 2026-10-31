"use client";
/* eslint-disable @next/next/no-img-element -- รูปจาก backend (ย่อเป็น JPEG ≤1600px แล้ว) ไม่ผ่าน image optimizer */
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Images, MapPin, Navigation, ParkingCircle, Phone, Wrench, X } from "lucide-react";
import { TEL, TEL_HREF } from "@/lib/contact";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { CATEGORY_META, bentoLayout, hasProfile, type PhotoCategory, type StoreGallery, type StorePhoto } from "@/lib/storeGallery";

type Section = PhotoCategory;
type Box = { list: StorePhoto[]; index: number } | null;

/**
 * ส่วน "หน้าร้าน / ทีมงาน / ช่าง / การเดินทาง" บนหน้าเว็บ — แต่ละส่วนซ่อนเองถ้าไม่มีข้อมูล (ไม่มีรูปตัวอย่างปลอม)
 * แตะรูปไหนก็เปิดดูเต็มจอ เลื่อนดูรูปในหมวดเดียวกันได้
 */
export default function StoreSections({ gallery, sections }: { gallery: StoreGallery; sections: Section[] }) {
  const [box, setBox] = useState<Box>(null);
  const open = (list: StorePhoto[], index: number) => setBox({ list, index });

  return (
    <>
      {sections.map((s) => {
        const list = gallery.photos[s] ?? [];
        if (s === "STORE") return list.length > 0 ? <StoreBento key={s} photos={list} onOpen={open} /> : null;
        if (s === "DIRECTIONS") {
          return list.length > 0 || hasProfile(gallery.profile)
            ? <Directions key={s} photos={list} profile={gallery.profile} onOpen={open} /> : null;
        }
        return list.length > 0 ? <People key={s} category={s} photos={list} onOpen={open} /> : null;
      })}
      {box && <Lightbox box={box} onChange={setBox} />}
    </>
  );
}

function SectionHead({ label, title, desc }: { label: string; title: string; desc?: string }) {
  return (
    <div className="mb-8 text-center">
      <p className="section-label justify-center">{label}</p>
      <h2 className="text-2xl font-bold text-text-heading md:text-3xl">{title}</h2>
      {desc && <p className="mx-auto mt-2 max-w-2xl text-sm text-text-muted md:text-base">{desc}</p>}
    </div>
  );
}

/** รูปเต็มกรอบ + คำบรรยายทับล่าง */
function Tile({ p, className, onClick, more }: { p: StorePhoto; className: string; onClick: () => void; more?: number }) {
  return (
    <button type="button" onClick={onClick} aria-label={p.title ? `ดูรูป ${p.title}` : "ดูรูปขนาดเต็ม"}
            className={`group relative overflow-hidden rounded-2xl bg-bg-subtle ${className}`}>
      <img src={p.url} alt={p.title ?? "รูปหน้าร้าน DD Mobile"} width={p.width} height={p.height} loading="lazy" decoding="async"
           className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      {p.title && !more && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-left text-sm font-semibold text-white">
          {p.title}
        </span>
      )}
      {!!more && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white">
          <Images size={22} /><span className="text-sm font-bold">ดูอีก {more} รูป</span>
        </span>
      )}
    </button>
  );
}

function StoreBento({ photos, onOpen }: { photos: StorePhoto[]; onOpen: (l: StorePhoto[], i: number) => void }) {
  const { grid, tiles } = bentoLayout(photos.length);
  const extra = photos.length - tiles.length;
  return (
    <section id={CATEGORY_META.STORE.anchor} className="container-dd scroll-mt-24 py-12 md:py-16">
      <SectionHead label="หน้าร้านของเรา" title="ร้านจริง มีหน้าร้านให้มาดูเครื่องได้"
                   desc="แวะมาดูเครื่องตัวจริง ตรวจสภาพ และทำสัญญาที่ร้านได้ทุกวัน" />
      <div className={`${grid} gap-3 md:gap-4`}>
        {tiles.map((cls, i) => (
          <Tile key={photos[i].id} p={photos[i]} className={cls} onClick={() => onOpen(photos, i)}
                more={i === tiles.length - 1 && extra > 0 ? extra : undefined} />
        ))}
      </div>
    </section>
  );
}

/** ทีมงาน / ช่าง — การ์ดแนวตั้งขนาดเท่ากัน แถวสุดท้ายที่ไม่เต็มจัดกึ่งกลาง (สมมาตร) */
function People({ category, photos, onOpen }: { category: "TEAM" | "TECHNICIAN"; photos: StorePhoto[]; onOpen: (l: StorePhoto[], i: number) => void }) {
  const tech = category === "TECHNICIAN";
  return (
    <section id={CATEGORY_META[category].anchor} className={`scroll-mt-24 py-12 md:py-16 ${tech ? "" : "bg-bg-subtle"}`}>
      <div className="container-dd">
        {tech
          ? <SectionHead label="ช่างเทคนิค" title="ช่างผู้ชำนาญ ดูแลเครื่องของคุณ" desc="ตรวจเช็กสภาพเครื่องทุกเครื่องก่อนส่งมอบ โดยช่างประจำร้าน" />
          : <SectionHead label="ทีมงาน" title="ทีมงานที่พร้อมดูแลคุณ" desc="ทีมงานตัวจริงที่ตอบแชท นัดรับเครื่อง และดูแลหลังการขาย" />}
        <ul className="flex flex-wrap justify-center gap-4 md:gap-6">
          {photos.map((p, i) => (
            <li key={p.id} className="w-[calc(50%-8px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-18px)]">
              <button type="button" onClick={() => onOpen(photos, i)} className="group block w-full text-center" aria-label={p.title ? `ดูรูป ${p.title}` : "ดูรูปขนาดเต็ม"}>
                <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl border border-border-default bg-white">
                  <img src={p.url} alt={p.title ?? (tech ? "ช่างเทคนิค DD Mobile" : "ทีมงาน DD Mobile")} width={p.width} height={p.height}
                       loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  {tech && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-text-heading backdrop-blur">
                      <Wrench size={11} className="text-yellow-hover" /> ช่างประจำร้าน
                    </span>
                  )}
                </span>
                {p.title && <span className="mt-3 block font-bold text-text-heading">{p.title}</span>}
                {p.subtitle && <span className="mt-0.5 block text-sm text-text-muted">{p.subtitle}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Directions({ photos, profile, onOpen }: {
  photos: StorePhoto[]; profile: StoreGallery["profile"]; onOpen: (l: StorePhoto[], i: number) => void;
}) {
  const facts = [
    profile.address && { icon: MapPin, label: "ที่อยู่ร้าน", value: profile.address, note: profile.landmark },
    profile.hours && { icon: Clock, label: "เวลาเปิดร้าน", value: profile.hours },
    profile.parking && { icon: ParkingCircle, label: "ที่จอดรถ", value: profile.parking },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string; note?: string | null }[];
  const single = photos.length === 1;

  return (
    <section id={CATEGORY_META.DIRECTIONS.anchor} className="scroll-mt-24 py-12 md:py-16">
      <div className="container-dd">
        <SectionHead label="การเดินทาง" title="เดินทางมาร้านอย่างไร" desc={photos.length > 1 ? "ทำตามรูปทีละขั้น มาถึงหน้าร้านได้ไม่หลง" : undefined} />

        {facts.length > 0 && (
          <div className={`mx-auto grid gap-3 ${facts.length === 1 ? "max-w-md" : facts.length === 2 ? "max-w-3xl sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {facts.map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="flex flex-col items-center rounded-2xl border border-border-default bg-white px-5 py-6 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow text-text-heading"><Icon size={20} /></span>
                <p className="mt-3 text-xs font-semibold text-text-muted">{label}</p>
                <p className="mt-1 whitespace-pre-line font-semibold text-text-heading">{value}</p>
                {note && <p className="mt-1 text-sm text-text-muted">{note}</p>}
              </div>
            ))}
          </div>
        )}

        {(profile.mapsUrl || facts.length > 0) && (
          <div className={`mx-auto mt-5 grid gap-3 ${profile.mapsUrl ? "max-w-md grid-cols-2" : "max-w-[220px] grid-cols-1"}`}>
            {profile.mapsUrl && (
              <a href={profile.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary h-12 justify-center">
                <Navigation size={18} /> นำทาง Google Maps
              </a>
            )}
            <a href={TEL_HREF} className="btn-ghost h-12 justify-center bg-white"><Phone size={18} /> โทรถามทาง</a>
          </div>
        )}

        {photos.length > 0 && (
          <ol className={`mt-10 flex flex-wrap justify-center gap-5 ${single ? "" : "md:gap-6"}`}>
            {photos.map((p, i) => (
              <li key={p.id} className={single ? "w-full max-w-3xl" : "w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-16px)]"}>
                <article className="h-full overflow-hidden rounded-2xl border border-border-default bg-white">
                  <button type="button" onClick={() => onOpen(photos, i)} className={`group relative block w-full overflow-hidden bg-bg-subtle ${single ? "aspect-[16/10]" : "aspect-[4/3]"}`}
                          aria-label={`ดูรูปขั้นที่ ${i + 1} ขนาดเต็ม`}>
                    <img src={p.url} alt={p.title ?? `เส้นทางมาร้าน ขั้นที่ ${i + 1}`} width={p.width} height={p.height} loading="lazy" decoding="async"
                         className={`absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${single ? "object-contain" : "object-cover"}`} />
                    {!single && (
                      <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-yellow font-display text-lg font-bold text-text-heading shadow">
                        {i + 1}
                      </span>
                    )}
                  </button>
                  {(p.title || p.subtitle) && (
                    <div className="p-4">
                      {p.title && <h3 className="font-bold text-text-heading">{p.title}</h3>}
                      {p.subtitle && <p className="mt-1 text-sm leading-relaxed text-text-muted">{p.subtitle}</p>}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-6 text-center text-xs text-text-muted">หาไม่เจอ โทร <a href={TEL_HREF} className="font-semibold text-text-heading underline">{TEL}</a> ทีมงานช่วยบอกทางได้เลย</p>
      </div>
    </section>
  );
}

/** ดูรูปเต็มจอ: ← → / ปัดด้วยปุ่ม · Esc ปิด · บอกลำดับรูป */
function Lightbox({ box, onChange }: { box: NonNullable<Box>; onChange: (b: Box) => void }) {
  const { list, index } = box;
  const p = list[index];
  const go = useCallback((d: number) => onChange({ list, index: (index + d + list.length) % list.length }), [list, index, onChange]);
  const close = useCallback(() => onChange(null), [onChange]);
  useEscapeKey(true, close);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [go]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="ดูรูปขนาดเต็ม" onClick={close}>
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
        <span>{index + 1} / {list.length}</span>
        <button type="button" onClick={close} aria-label="ปิด" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X size={20} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        <img src={p.url} alt={p.title ?? "รูปร้าน DD Mobile"} className="max-h-full max-w-full rounded-xl object-contain" />
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="รูปก่อนหน้า"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"><ChevronLeft size={24} /></button>
            <button type="button" onClick={() => go(1)} aria-label="รูปถัดไป"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"><ChevronRight size={24} /></button>
          </>
        )}
      </div>
      <div className="min-h-[72px] px-6 py-4 text-center text-white" onClick={(e) => e.stopPropagation()}>
        {p.title && <p className="font-semibold">{p.title}</p>}
        {p.subtitle && <p className="mt-0.5 text-sm text-white/70">{p.subtitle}</p>}
      </div>
    </div>
  );
}
