"use client";
/* eslint-disable @next/next/no-img-element -- รูปรีวิวจาก backend (ย่อเป็น JPEG แล้ว) */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Facebook, Quote, ThumbsUp, X } from "lucide-react";
import api from "@/lib/api";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { SOURCE_LABEL, formatReviewDate, initialOf, type SocialReview, type SocialReviewList } from "@/lib/socialReviews";

/** โหลดรีวิวเพจครั้งเดียวต่อหน้า — ล่ม/ยังไม่มี = null (ฝั่งที่ใช้ซ่อน section เอง ไม่โชว์ของปลอม) */
export function useSocialReviews() {
  const [data, setData] = useState<SocialReviewList | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let alive = true;
    api.get<SocialReviewList>("/social-reviews")
      .then((r) => { if (alive) { setData(r.data); setState("ready"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, []);
  return { data, state };
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(reducedMotionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** ผู้ใช้ตั้งลดการเคลื่อนไหว — ฝั่งเซิร์ฟเวอร์ถือว่าไม่ได้ตั้ง */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);
}

/** รูปรีวิวขยายเต็มจอ (+ คำบรรยาย) — แตะพื้นหลัง / ปุ่มปิด / Esc เพื่อปิด · ล็อกการเลื่อนหน้าระหว่างเปิด */
export function useImageLightbox() {
  const [shown, setShown] = useState<{ src: string; caption?: string | null } | null>(null);
  const close = useCallback(() => setShown(null), []);
  const open = useCallback((src: string, caption?: string | null) => setShown({ src, caption }), []);
  useEscapeKey(!!shown, close);
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [shown]);
  const lightbox = shown ? (
    <div className="modal-backdrop" onClick={close} role="dialog" aria-modal="true" aria-label="รูปรีวิวขยาย">
      <button type="button" onClick={close} aria-label="ปิดรูป"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-text-heading shadow">
        <X size={22} />
      </button>
      <figure className="flex max-w-[92vw] flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <img src={shown.src} alt={shown.caption || "รูปรีวิวจากลูกค้า"} className="max-h-[80vh] max-w-[92vw] rounded-2xl object-contain" />
        {shown.caption && <figcaption className="rounded-full bg-white/95 px-4 py-1.5 text-center text-sm font-medium text-text-heading">{shown.caption}</figcaption>}
      </figure>
    </div>
  ) : null;
  return { open, lightbox };
}

/**
 * การ์ดรีวิวจากเพจโซเชียล — ข้อความตามต้นฉบับ · ชื่อย่อ + วงกลมอักษรแรก (ไม่ใช้รูปโปรไฟล์ลูกค้า)
 * ไม่มีดาว (Facebook ให้แค่ "แนะนำ") · clamp = ตัดข้อความยาวในแถวเลื่อนวนให้การ์ดสูงใกล้กัน
 */
export default function SocialReviewCard({ review, clamp = false, onImage, className = "", copy = false }: {
  review: SocialReview; clamp?: boolean; onImage?: (url: string) => void; className?: string;
  /** การ์ดสำเนาในแถบเลื่อนวน — ปุ่มรูปโฟกัสไม่ได้ (แถวสำเนาเป็น aria-hidden) แต่ยังแตะดูรูปได้ */
  copy?: boolean;
}) {
  const date = formatReviewDate(review.reviewedOn);
  const isFb = review.source === "FACEBOOK";
  return (
    <figure className={`flex flex-col gap-3 rounded-2xl border border-border-default bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        {review.recommended ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-muted px-2.5 py-1 text-[11px] font-bold text-text-heading">
            <ThumbsUp size={12} className="fill-yellow text-text-heading" /> แนะนำร้านนี้
          </span>
        ) : <span />}
        <Quote size={22} className="shrink-0 fill-yellow/30 text-yellow-hover" aria-hidden />
      </div>

      <blockquote className={`whitespace-pre-line text-[15px] leading-relaxed text-text-body ${clamp ? "line-clamp-4" : ""}`}>
        {review.text}
      </blockquote>

      {review.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.images.slice(0, clamp ? 3 : 6).map((img) => (
            <button key={img.id} type="button" onClick={() => onImage?.(img.url)} aria-label="ดูรูปประกอบรีวิวขนาดเต็ม" tabIndex={copy ? -1 : undefined}
                    className="overflow-hidden rounded-lg border border-border-subtle">
              <img src={img.url} alt="" width={img.width} height={img.height} loading="lazy" className="h-16 w-16 object-cover" />
            </button>
          ))}
        </div>
      )}

      <figcaption className="mt-auto flex items-center gap-3 border-t border-border-subtle pt-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow font-display text-base font-bold text-text-heading" aria-hidden>
          {initialOf(review.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-text-heading">{review.name}</span>
          <span className="flex flex-wrap items-center gap-x-1 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              {isFb && <Facebook size={12} className="shrink-0 text-[#1877F2]" aria-hidden />}
              รีวิวบน {SOURCE_LABEL[review.source] ?? "โซเชียล"}
            </span>
            {date && <span className="whitespace-nowrap">· {date}</span>}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
