"use client";
import { useEffect } from "react";
import { ExternalLink, Facebook, Loader2 } from "lucide-react";
import SocialReviewCard, { useImageLightbox, useSocialReviews } from "@/components/reviews/SocialReviewCard";
import { sectionSourceUrl } from "@/lib/socialReviews";

/**
 * หน้า /reviews: รีวิวจากเพจโซเชียลทั้งหมด (เรียงตามที่แอดมินจัด) แบบการ์ดก่ออิฐ 1/2/3 คอลัมน์
 * โหลดไม่ได้/ยังไม่มี = ไม่แสดงส่วนนี้ (ส่วนรีวิวผู้ซื้อบนเว็บยังอยู่)
 */
export default function SocialReviewsWall() {
  const { data, state } = useSocialReviews();
  const { open, lightbox } = useImageLightbox();
  const ready = state === "ready" && (data?.count ?? 0) > 0;

  // มาจากปุ่มหน้าแรก (/reviews#facebook) — ส่วนนี้โหลดทีหลัง เบราว์เซอร์จึงเลื่อนหา anchor ไม่เจอเอง
  useEffect(() => {
    if (ready && window.location.hash === "#facebook") document.getElementById("facebook")?.scrollIntoView();
  }, [ready]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted" aria-busy="true">
        <Loader2 size={18} className="animate-spin" /> กำลังโหลดรีวิว…
      </div>
    );
  }
  if (!data || data.count === 0) return null;

  return (
    <section id="facebook" aria-labelledby="facebook-reviews-title" className="scroll-mt-24">
      <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 id="facebook-reviews-title" className="flex items-center gap-2 text-xl font-bold text-text-heading md:text-2xl">
            <Facebook size={24} className="text-[#1877F2]" aria-hidden /> รีวิวจากเพจ Facebook
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {data.count.toLocaleString()} รีวิว · ข้อความตามต้นฉบับ ย่อชื่อเพื่อความเป็นส่วนตัว
          </p>
        </div>
        <a href={sectionSourceUrl(data.reviews)} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-4 py-2 text-sm font-semibold text-text-heading transition-colors hover:border-yellow">
          ดูต้นฉบับบน Facebook <ExternalLink size={14} aria-hidden />
        </a>
      </div>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {data.reviews.map((r) => (
          <li key={r.id} className="mb-4 break-inside-avoid">
            <SocialReviewCard review={r} onImage={open} />
          </li>
        ))}
      </ul>
      {lightbox}
    </section>
  );
}
