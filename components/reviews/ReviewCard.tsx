"use client";
/* eslint-disable @next/next/no-img-element -- รูปรีวิวมาจาก backend (/uploads) ไม่ผ่าน image optimizer */
import { BadgeCheck, Star, Store, ThumbsUp } from "lucide-react";
import { reviewDate, tagLabel, verifiedLabel, type PublicReview } from "@/lib/reviews";

export function Stars({ n, size = 15, className = "" }: { n: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} role="img" aria-label={`${n} จาก 5 ดาว`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= n ? "fill-yellow text-yellow" : "fill-border-subtle text-border-default"} />
      ))}
    </span>
  );
}

/** วงกลมตัวอักษรแรกของชื่อ (หลัง "คุณ") — ไม่ใช้รูปโปรไฟล์จริง */
function Avatar({ name }: { name: string }) {
  const ch = name.replace(/^คุณ/, "").trim().charAt(0) || "D";
  return (
    <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-muted font-display text-lg font-bold text-yellow-text">
      {ch}
    </span>
  );
}

/**
 * การ์ดรีวิว 1 ใบ — หัว: ชื่อ + ป้ายยืนยันการซื้อ | ดาว · เนื้อ: ความเห็น/จุดเด่น/รูป · ท้าย: ร้านตอบ + โหวต
 * highlight = รีวิวของคนที่เพิ่งส่ง (กรอบเหลือง)
 */
export default function ReviewCard({ review: r, onVote, onImage, highlight = false }: {
  review: PublicReview;
  onVote?: (r: PublicReview) => void;
  onImage?: (src: string) => void;
  highlight?: boolean;
}) {
  const tags = (r.tags ?? []).map(tagLabel).filter((t): t is string => !!t);
  return (
    <article className={`flex h-full flex-col rounded-2xl border bg-white p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] ${highlight ? "border-yellow ring-4 ring-yellow/20" : "border-border-default"}`}>
      <header className="flex items-start gap-3">
        <Avatar name={r.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-text-heading">{r.displayName}</p>
            <Stars n={r.rating} size={14} className="shrink-0" />
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-success-text">
            <BadgeCheck size={12} className="shrink-0" /> <span className="truncate">{verifiedLabel(r.channel)}</span>
          </p>
        </div>
      </header>

      <p className="mt-3 line-clamp-1 text-xs text-text-muted">
        {r.productName ?? "รีวิวร้าน DD Mobile"}{r.variantLabel ? ` · ${r.variantLabel}` : ""}{r.createdAt ? ` · ${reviewDate(r.createdAt)}` : ""}
      </p>

      {r.comment
        ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-body">{r.comment}</p>
        : <p className="mt-2 text-sm text-text-muted">ให้คะแนน {r.rating} ดาว</p>}

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t) => <li key={t} className="rounded-full bg-bg-subtle px-2.5 py-1 text-[11px] font-medium text-text-body">{t}</li>)}
        </ul>
      )}

      {r.images.length > 0 && (
        <div className="mt-3 grid max-w-[264px] grid-cols-3 gap-2">
          {r.images.map((src, i) => (
            <button key={src} type="button" onClick={() => onImage?.(src)} aria-label={`ขยายรูปรีวิว ${i + 1}`}
                    className="aspect-square overflow-hidden rounded-xl border border-border-default transition-transform hover:scale-[1.03]">
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

      {onVote && (
        <div className="mt-auto pt-3">
          <button type="button" onClick={() => onVote(r)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${r.votedByMe ? "border-yellow bg-yellow/15 text-text-heading" : "border-border-default text-text-muted hover:border-yellow hover:text-text-heading"}`}>
            <ThumbsUp size={12} className={r.votedByMe ? "fill-yellow text-yellow-hover" : ""} /> มีประโยชน์{r.helpfulCount > 0 && ` (${r.helpfulCount})`}
          </button>
        </div>
      )}
    </article>
  );
}
