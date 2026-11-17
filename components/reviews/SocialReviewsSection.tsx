"use client";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Facebook } from "lucide-react";
import Reveal from "@/components/Reveal";
import SocialReviewCard, { useImageLightbox, useReducedMotion, useSocialReviews } from "@/components/reviews/SocialReviewCard";
import { ReviewPhotoStrip, useReviewPhotos } from "@/components/reviews/ReviewPhotos";
import { HOME_REVIEW_COUNT, sectionSourceUrl, type SocialReview } from "@/lib/socialReviews";

const CARD_W = "w-[280px] sm:w-[320px]";

/**
 * หน้าแรก: แถบรูปรีวิวเลื่อนวน (รูปที่พนักงานอัปในหลังบ้าน) + รีวิวจากเพจ Facebook (ชุดแรกตามลำดับที่แอดมินจัด)
 * เลื่อนวน 2 แถวสวนกัน → ปุ่มไปหน้า /reviews
 * ไม่มีทั้งรูปและรีวิว/โหลดไม่ได้ = ไม่แสดง section · ตั้งลดการเคลื่อนไหว หรือมีน้อย = แถวปัดเอง
 */
export default function SocialReviewsSection() {
  const { data } = useSocialReviews();
  const photos = useReviewPhotos();
  const reduce = useReducedMotion();
  const { open, lightbox } = useImageLightbox();
  const count = data?.count ?? 0;
  const photoCount = photos?.length ?? 0;
  if (count === 0 && photoCount === 0) return null;

  const shown = (data?.reviews ?? []).slice(0, HOME_REVIEW_COUNT);
  const source = sectionSourceUrl(data?.reviews ?? []);
  const marquee = !reduce && shown.length >= 6;
  const rows = [shown.filter((_, i) => i % 2 === 0), shown.filter((_, i) => i % 2 === 1)];

  return (
    <section aria-labelledby="social-reviews-title" className="border-t border-border-default bg-white py-12 md:py-16">
      <div className="container-dd">
        <Reveal>
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="section-label">{count > 0 ? "รีวิวจากเพจ Facebook ของร้าน" : "รีวิวจากลูกค้า"}</p>
              <h2 id="social-reviews-title" className="text-2xl font-bold text-text-heading md:text-3xl">
                ลูกค้า<span className="rounded-lg bg-yellow px-2">แนะนำ</span> DD Mobile
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {count > 0 ? "ข้อความจริงจากรีวิวบนเพจ Facebook ของร้าน · ย่อชื่อเพื่อความเป็นส่วนตัวของลูกค้า" : "ภาพจริงจากลูกค้าของร้าน"}
                {count > 0 && photoCount > 0 ? " · พร้อมภาพจากลูกค้าจริง" : ""}
              </p>
            </div>
            {count > 0 && (
              <Link href="/reviews#facebook"
                    className="group flex items-center gap-3 rounded-2xl border border-border-default bg-white px-5 py-3 transition-colors hover:border-yellow">
                <Facebook size={30} className="text-[#1877F2]" aria-hidden />
                <span className="flex flex-col">
                  <span className="font-display text-2xl font-bold leading-none text-text-heading">{count.toLocaleString()} รีวิว</span>
                  <span className="mt-1 text-xs text-text-muted">จากลูกค้าบนโซเชียลของร้าน</span>
                </span>
                <ArrowRight size={18} className="ml-1 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text-heading" />
              </Link>
            )}
          </div>
        </Reveal>
      </div>

      {photos && photoCount > 0 && (
        <div className={count > 0 ? "mb-6" : ""}>
          <ReviewPhotoStrip photos={photos} reduceMotion={reduce} onOpen={open} />
        </div>
      )}

      {count === 0 ? null : marquee ? (
        <div className="flex flex-col gap-4">
          {rows.map((row, r) => (
            <div key={r} className="review-marquee">
              <ul className={`review-marquee-track ${r === 1 ? "review-marquee-reverse" : ""}`}
                  // ~7 วินาทีต่อการ์ด — อ่านทัน ไม่ช้าจนดูนิ่ง
                  style={{ "--marquee-duration": `${Math.max(35, row.length * 7)}s` } as CSSProperties}>
                {/* ชุดที่ 2 = สำเนาให้วนต่อเนื่อง — aria-hidden + ปุ่มโฟกัสไม่ได้ (ไม่ถูกอ่าน/โฟกัสซ้ำ) แต่ยังแตะรูปได้ */}
                {[0, 1].map((copy) => row.map((rv) => (
                  <li key={`${copy}-${rv.id}`} aria-hidden={copy === 1 || undefined} className={`${CARD_W} shrink-0 pr-4`}>
                    <SocialReviewCard review={rv} clamp onImage={open} className="h-full" copy={copy === 1} />
                  </li>
                )))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <SwipeRow reviews={shown} onImage={open} />
      )}

      <div className="container-dd mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
        {count > 0 ? (
          <Link href="/reviews#facebook" className="btn-primary px-6 py-3">ดูรีวิวทั้งหมด {count.toLocaleString()} รีวิว <ArrowRight size={16} /></Link>
        ) : (
          <Link href="/reviews#photos" className="btn-primary px-6 py-3">ดูภาพจากลูกค้าทั้งหมด <ArrowRight size={16} /></Link>
        )}
        {count > 0 && (
          <a href={source} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-body underline-offset-4 hover:underline">
            ดูต้นฉบับบน Facebook <ExternalLink size={14} aria-hidden />
          </a>
        )}
      </div>
      {lightbox}
    </section>
  );
}

/** แถวเดียวปัดเอง (scroll-snap) — ตั้งลดการเคลื่อนไหว หรือรีวิวยังน้อยจนวนแล้วซ้ำเห็นชัด */
function SwipeRow({ reviews, onImage }: { reviews: SocialReview[]; onImage: (url: string) => void }) {
  return (
    <ul className="container-dd flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
      {reviews.map((r) => (
        <li key={r.id} className={`${CARD_W} shrink-0 snap-start`}>
          <SocialReviewCard review={r} clamp onImage={onImage} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
