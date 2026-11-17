"use client";
/* eslint-disable @next/next/no-img-element -- รูปรีวิวจาก backend (ย่อเป็น JPEG แล้ว) */
import { useEffect, useState, type CSSProperties } from "react";
import { Camera, Expand } from "lucide-react";
import api from "@/lib/api";
import { MARQUEE_MIN_PHOTOS, loopDuration, loopSet, tileAspect, type ReviewPhoto, type ReviewPhotoList } from "@/lib/reviewPhotos";

/** โหลดรูปรีวิวครั้งเดียวต่อหน้า — ล่ม/ยังไม่มี = [] (ฝั่งที่ใช้ซ่อนส่วนนี้เอง) */
export function useReviewPhotos() {
  const [photos, setPhotos] = useState<ReviewPhoto[] | null>(null);
  useEffect(() => {
    let alive = true;
    api.get<ReviewPhotoList>("/review-photos")
      .then((r) => { if (alive) setPhotos(r.data.photos ?? []); })
      .catch(() => { if (alive) setPhotos([]); });
    return () => { alive = false; };
  }, []);
  return photos;
}

type Open = (src: string, caption?: string | null) => void;

/** กรอบรูปหนึ่งใบ: สูงคงที่ กว้างตามสัดส่วนรูป · คำบรรยายทับขอบล่าง · แตะเพื่อดูเต็มจอ */
function Tile({ photo, onOpen, className = "", copy = false }: { photo: ReviewPhoto; onOpen: Open; className?: string; copy?: boolean }) {
  return (
    <button type="button" onClick={() => onOpen(photo.url, photo.caption)} tabIndex={copy ? -1 : undefined}
            aria-label={photo.caption ? `ดูรูปเต็ม: ${photo.caption}` : "ดูรูปรีวิวจากลูกค้าขนาดเต็ม"}
            style={{ aspectRatio: tileAspect(photo.width, photo.height) }}
            className={`group relative block overflow-hidden rounded-2xl border border-border-default bg-bg-subtle shadow-[0_1px_2px_rgba(16,24,40,0.06)] ${className}`}>
      <img src={photo.url} alt={photo.caption ?? "รูปรีวิวจากลูกค้า DD Mobile"} width={photo.width} height={photo.height}
           loading="lazy" decoding="async" draggable={false}
           className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      {photo.caption && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2.5 pt-8 text-left text-xs font-medium leading-snug text-white sm:text-sm">
          <span className="line-clamp-2">{photo.caption}</span>
        </span>
      )}
      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-text-heading opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
        <Expand size={14} />
      </span>
    </button>
  );
}

/**
 * หน้าแรก: แถบรูปรีวิวเลื่อนวนต่อเนื่อง (หยุดเมื่อชี้/แตะ/โฟกัส) · รูปน้อย หรือผู้ใช้ตั้งลดการเคลื่อนไหว = แถวปัดเอง
 * ไม่มีรูป = ไม่แสดง (ไม่มีกรอบว่าง)
 */
export function ReviewPhotoStrip({ photos, reduceMotion, onOpen }: { photos: ReviewPhoto[]; reduceMotion: boolean; onOpen: Open }) {
  if (photos.length === 0) return null;
  const marquee = !reduceMotion && photos.length >= MARQUEE_MIN_PHOTOS;
  const tileH = "h-52 sm:h-64";

  if (!marquee) {
    return (
      <ul className="container-dd flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]" aria-label="รูปรีวิวจากลูกค้า">
        {photos.map((p) => (
          <li key={p.id} className={`${tileH} shrink-0 snap-start`}><Tile photo={p} onOpen={onOpen} className="h-full" /></li>
        ))}
      </ul>
    );
  }

  const set = loopSet(photos);
  return (
    <div className="review-marquee" aria-label="รูปรีวิวจากลูกค้า (เลื่อนอัตโนมัติ — ชี้หรือแตะค้างเพื่อหยุด)">
      <ul className="review-marquee-track review-marquee-reverse"
          style={{ "--marquee-duration": `${loopDuration(set.length)}s` } as CSSProperties}>
        {/* รูปซ้ำ (ทวนให้ยาวพอ + ชุดที่ 2 ให้วนต่อเนื่อง) = aria-hidden + โฟกัสไม่ได้ แต่ยังแตะ/คลิกดูรูปได้
            (ห้ามใช้ inert — inert กินคลิกด้วย แตะรูปที่เห็นส่วนใหญ่แล้วไม่มีอะไรเกิดขึ้น) */}
        {[0, 1].map((round) => set.map(({ key, photo }, i) => {
          const copy = round === 1 || i >= photos.length;
          return (
            <li key={`${round}-${key}`} aria-hidden={copy || undefined} className={`${tileH} shrink-0 pr-3`}>
              <Tile photo={photo} onOpen={onOpen} className="h-full" copy={copy} />
            </li>
          );
        }))}
      </ul>
    </div>
  );
}

/** หน้า /reviews: แกลเลอรีรูปรีวิวทั้งหมด (ก่ออิฐ 2/3/4 คอลัมน์) · ไม่มีรูป = ไม่แสดง */
export function ReviewPhotoGallery({ photos, onOpen }: { photos: ReviewPhoto[]; onOpen: Open }) {
  if (photos.length === 0) return null;
  return (
    <section id="photos" aria-labelledby="review-photos-title" className="scroll-mt-24">
      <h2 id="review-photos-title" className="mb-1 flex items-center gap-2 text-xl font-bold text-text-heading md:text-2xl">
        <Camera size={22} className="text-yellow-hover" aria-hidden /> ภาพจากลูกค้าจริง
      </h2>
      <p className="mb-5 text-sm text-text-muted">{photos.length.toLocaleString()} ภาพจากลูกค้าของร้าน · แตะเพื่อดูเต็มจอ</p>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((p) => (
          <li key={p.id} className="mb-3 break-inside-avoid">
            <Tile photo={p} onOpen={onOpen} className="w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
