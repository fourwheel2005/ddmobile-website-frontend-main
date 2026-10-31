"use client";
/* eslint-disable @next/next/no-img-element -- พรีวิวรูปจากเครื่องลูกค้า (blob:) */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Camera, Check, Clock, Link2Off, Loader2, MessageCircle, PenLine, ShieldCheck, Star, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";
import { useEscapeKey } from "@/lib/useEscapeKey";
import { LINE_URL } from "@/lib/contact";
import {
  REVIEW_TAGS, STAR_WORDS, channelLabel, maskReviewName, type InviteView, type PublicReview,
} from "@/lib/reviews";
import ReviewCard from "@/components/reviews/ReviewCard";
import StoreReviews from "@/components/reviews/StoreReviews";

const MAX_IMAGES = 3;
const MAX_COMMENT = 500;
const MAX_NAME = 40;

type Photo = { file: File; preview: string };

/**
 * หน้าลิงก์ขอรีวิว: ป๊อปอัพเขียนรีวิวเด้งขึ้นทันที (ลูกค้ามาเพื่อสิ่งนี้) · ข้างหลังคือรีวิวทั้งร้าน
 * (ปิดป๊อปอัพ = เห็นรีวิวคนอื่นก่อนก็ได้ — ปุ่มลอย "เขียนรีวิว" เปิดกลับ)
 * ส่งแล้ว → ป๊อปอัพขอบคุณ + รีวิวของตัวเองปักไว้บนสุด
 */
export default function ReviewInviteExperience({ token, initial }: { token: string; initial: InviteView | null }) {
  const [invite, setInvite] = useState<InviteView | null>(initial);
  const [open, setOpen] = useState(true);
  const [justSent, setJustSent] = useState(false);
  const status = invite?.status ?? "MISSING";
  const canWrite = status === "PENDING" || status === "OPENED";
  const mine = invite?.review ?? null;

  // นับว่า "ลูกค้าเปิดแล้ว" จากเบราว์เซอร์จริงเท่านั้น (บอทพรีวิวลิงก์ของ LINE/FB ไม่รัน JS)
  useEffect(() => {
    if (initial && (initial.status === "PENDING" || initial.status === "OPENED")) {
      api.post(`/review-invites/${token}/open`).catch(() => {});
    }
  }, [initial, token]);

  // ล็อกสกอลล์พื้นหลัง + Esc ปิด ขณะป๊อปอัพเปิด
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<InviteView>(`/review-invites/${token}`);
      setInvite(res.data);
    } catch { /* คงสถานะเดิม */ }
  }, [token]);

  const onSent = (review: PublicReview) => {
    setInvite((v) => (v ? { ...v, status: "USED", review } : v));
    setJustSent(true);
  };

  const close = useCallback(() => setOpen(false), []);
  useEscapeKey(open, close);

  return (
    <>
      <div className="page-wrapper min-h-screen bg-bg-subtle">
        <div className="container-dd max-w-5xl py-8 md:py-12">
          <div className="mb-6 text-center">
            <p className="section-label justify-center">รีวิวจากลูกค้าจริง</p>
            <h1 className="text-2xl font-bold text-text-heading md:text-3xl">ลูกค้าพูดถึง DD Mobile อย่างไร</h1>
          </div>
          <StoreReviews pinned={mine} />
        </div>
      </div>

      {/* ปิดป๊อปอัพไปแล้วแต่ยังไม่รีวิว → ปุ่มลอยกลางล่างเปิดกลับ (อยู่ใต้แบนเนอร์คุกกี้ z-95 — ไม่ทับปุ่มยินยอม) */}
      {!open && canWrite && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[94] flex justify-center px-4 md:bottom-8">
          <button type="button" onClick={() => setOpen(true)}
                  className="btn-primary pointer-events-auto h-12 rounded-full px-7 shadow-[0_12px_32px_rgba(255,212,0,0.45)]">
            <PenLine size={18} /> เขียนรีวิวของคุณ
          </button>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <motion.div key="backdrop" className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="review-popup-title"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={close}>
            <motion.div onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="relative w-full max-w-[440px] overflow-hidden rounded-[28px] bg-white shadow-[0_32px_80px_rgba(16,24,40,0.28)]">
              <PopupHero onClose={close} tone={status === "EXPIRED" || status === "REVOKED" || status === "MISSING" ? "muted" : "brand"} />
              <div className="px-6 pb-6 pt-12 sm:px-8 sm:pb-8">
                {canWrite && invite
                  ? <ReviewForm token={token} invite={invite} onSent={onSent} onStale={refresh} />
                  : status === "USED"
                    ? <Thanks review={mine} fresh={justSent} onClose={close} />
                    : <Closed status={status} onClose={close} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** แถบหัวป๊อปอัพสีแบรนด์ + โลโก้ร้านลอยกึ่งกลางทับขอบ (สมมาตรซ้ายขวา) */
function PopupHero({ onClose, tone }: { onClose: () => void; tone: "brand" | "muted" }) {
  return (
    <div className={`relative h-28 ${tone === "brand" ? "bg-yellow" : "bg-bg-subtle"}`}>
      <span aria-hidden className="absolute -left-10 -top-12 h-36 w-36 rounded-full bg-white/25" />
      <span aria-hidden className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/25" />
      <button type="button" onClick={onClose} aria-label="ปิด"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-text-heading backdrop-blur transition-colors hover:bg-white">
        <X size={18} />
      </button>
      <div className="absolute inset-x-0 -bottom-10 flex justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
          <Image src="/images/logo.png" alt="DD Mobile" width={64} height={26} className="h-auto w-14 object-contain" />
        </span>
      </div>
    </div>
  );
}

function ReviewForm({ token, invite, onSent, onStale }: {
  token: string; invite: InviteView; onSent: (r: PublicReview) => void; onStale: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [name, setName] = useState(invite.firstName ?? "");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => { photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)); }, []);

  const shown = hover || rating;
  const praise = rating >= 3;

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - photosRef.current.length;
    const picked = Array.from(files).filter((f) => {
      if (f.type.startsWith("image/")) return true;
      toast.error(`"${f.name}" ไม่ใช่ไฟล์รูป`);
      return false;
    });
    if (picked.length > room) toast(`แนบได้สูงสุด ${MAX_IMAGES} รูป`);
    const next: Photo[] = [];
    for (const f of picked.slice(0, Math.max(0, room))) {
      const c = await compressImage(f);
      next.push({ file: c, preview: URL.createObjectURL(c) });
    }
    setPhotos((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  };

  const removePhoto = (i: number) => setPhotos((arr) => {
    URL.revokeObjectURL(arr[i].preview);
    return arr.filter((_, j) => j !== i);
  });

  const toggleTag = (code: string) => setTags((t) => (t.includes(code) ? t.filter((x) => x !== code) : [...t, code]));

  const submit = async () => {
    if (rating < 1) { toast.error("แตะดาวเพื่อให้คะแนนก่อนนะครับ"); return; }
    if (!name.trim()) { toast.error("กรอกชื่อที่จะแสดงบนรีวิว"); return; }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("rating", String(rating));
      fd.append("displayName", name.trim());
      if (comment.trim()) fd.append("comment", comment.trim());
      (praise ? tags : []).forEach((t) => fd.append("tags", t));
      photos.forEach((p) => fd.append("images", p.file));
      const res = await api.post<PublicReview>(`/review-invites/${token}`, fd);
      onSent(res.data);
    } catch (e) {
      const st = getApiStatus(e);
      if (st === 409 || st === 410 || st === 404) { onStale(); toast(getApiError(e, "ลิงก์นี้ใช้ไม่ได้แล้ว")); }
      else toast.error(getApiError(e, "ส่งรีวิวไม่สำเร็จ ลองอีกครั้งนะครับ"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="text-center">
      <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-bg px-3 py-1 text-[11px] font-semibold text-success-text">
        <BadgeCheck size={13} /> ร้านยืนยันการซื้อของคุณแล้ว
      </span>
      <h2 id="review-popup-title" className="mt-3 font-display text-2xl font-bold text-text-heading">
        สวัสดีคุณ{invite.firstName ?? "ลูกค้า"} 👋
      </h2>
      <p className="mx-auto mt-1 max-w-[340px] text-sm leading-relaxed text-text-muted">
        ขอบคุณที่ไว้วางใจซื้อ{invite.productName ? <> <b className="font-semibold text-text-heading">{invite.productName}</b> </> : "สินค้า"}กับเรา
        {invite.channel ? (invite.channel === "STORE" ? "ที่หน้าร้าน" : ` ทาง ${channelLabel(invite.channel)}`) : ""}
        <br />ประสบการณ์ของคุณเป็นอย่างไรบ้างครับ?
      </p>

      {/* ดาว — ใหญ่ กึ่งกลาง */}
      <div className="mt-5 flex justify-center gap-1.5" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="ให้คะแนน">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} ดาว · ${STAR_WORDS[i]}`}
                         onClick={() => setRating(i)} onMouseEnter={() => setHover(i)}
                         whileTap={{ scale: 0.85 }} animate={{ scale: i <= shown ? 1.08 : 1 }}
                         className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2">
            <Star size={40} strokeWidth={1.6} className={i <= shown ? "fill-yellow text-yellow-hover" : "fill-bg-subtle text-border-default"} />
          </motion.button>
        ))}
      </div>
      <p className={`mt-1 h-5 text-sm font-semibold ${shown ? "text-text-heading" : "text-text-disabled"}`} aria-live="polite">
        {shown ? STAR_WORDS[shown] : "แตะดาวเพื่อให้คะแนน"}
      </p>

      <AnimatePresence initial={false}>
        {rating > 0 && (
          <motion.div key="more" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="space-y-5 pt-5 text-left">
              {praise && (
                <fieldset>
                  <legend className="mb-2 w-full text-center text-xs font-semibold text-text-muted">ประทับใจเรื่องไหนบ้าง (เลือกได้หลายข้อ)</legend>
                  <div className="flex flex-wrap justify-center gap-2">
                    {REVIEW_TAGS.map((t) => {
                      const on = tags.includes(t.code);
                      return (
                        <button key={t.code} type="button" onClick={() => toggleTag(t.code)} aria-pressed={on}
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-yellow bg-yellow-muted text-text-heading" : "border-border-default bg-white text-text-body hover:border-yellow"}`}>
                          {on && <Check size={12} />} {t.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div>
                <label htmlFor="rv-comment" className="mb-1.5 block text-xs font-semibold text-text-muted">
                  {praise ? "เล่าเพิ่มเติม (ไม่บังคับ)" : "บอกเราหน่อยว่าควรปรับปรุงอะไร (ไม่บังคับ)"}
                </label>
                <textarea id="rv-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={MAX_COMMENT} rows={3}
                          placeholder={praise ? "เช่น เครื่องสวยตรงปก แอดมินดูแลดี ผ่อนง่าย…" : "ร้านจะนำไปปรับปรุง และอาจติดต่อกลับเพื่อช่วยแก้ไขครับ"}
                          className="input-dd resize-none" />
                <p className="mt-1 text-right text-[11px] tabular-nums text-text-disabled">{comment.length}/{MAX_COMMENT}</p>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-text-muted">แนบรูป (ไม่บังคับ · สูงสุด {MAX_IMAGES} รูป)</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {Array.from({ length: MAX_IMAGES }).map((_, i) => {
                    const p = photos[i];
                    if (p) {
                      return (
                        <div key={p.preview} className="relative aspect-square overflow-hidden rounded-2xl border border-border-default">
                          <img src={p.preview} alt={`รูปที่ ${i + 1}`} className="h-full w-full object-cover" />
                          <button type="button" onClick={() => removePhoto(i)} aria-label={`ลบรูปที่ ${i + 1}`}
                                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-error-text">
                            <X size={13} />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button key={`add-${i}`} type="button" onClick={() => fileRef.current?.click()} disabled={i !== photos.length}
                              aria-label="เพิ่มรูป"
                              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed text-text-muted transition-colors ${i === photos.length ? "border-border-default bg-bg-subtle hover:border-yellow hover:text-yellow-text" : "border-border-subtle bg-white opacity-50"}`}>
                        <Camera size={20} />
                        <span className="text-[11px]">{i === photos.length ? "เพิ่มรูป" : ""}</span>
                      </button>
                    );
                  })}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                       onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              </div>

              <div>
                <label htmlFor="rv-name" className="mb-1.5 block text-xs font-semibold text-text-muted">ชื่อที่แสดงบนรีวิว</label>
                <input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME}
                       className="input-dd" autoComplete="given-name" />
                <p className="mt-1 text-[11px] text-text-muted">จะแสดงเป็น <b className="text-text-heading">{maskReviewName(name)}</b> เพื่อความเป็นส่วนตัว</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="button" onClick={submit} disabled={sending || rating < 1}
              className="btn-primary mt-6 h-12 w-full justify-center text-base disabled:cursor-not-allowed disabled:opacity-50">
        {sending ? <><Loader2 size={18} className="animate-spin" /> กำลังส่งรีวิว…</> : "ส่งรีวิว"}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-text-muted">
        <ShieldCheck size={12} /> ไม่แสดงเบอร์โทร/ข้อมูลส่วนตัว · รีวิวทุกคะแนนแสดงตามจริง
      </p>
    </div>
  );
}

/** ส่งแล้ว / เคยรีวิวแล้ว */
function Thanks({ review, fresh, onClose }: { review: PublicReview | null; fresh: boolean; onClose: () => void }) {
  return (
    <div className="text-center">
      <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                   transition={{ type: "spring", stiffness: 260, damping: 16 }}
                   className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-text text-white">
        {fresh && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-success-text/30" />}
        <Check size={32} strokeWidth={3} />
      </motion.span>
      <h2 id="review-popup-title" className="mt-4 font-display text-2xl font-bold text-text-heading">
        {fresh ? "ขอบคุณมากครับ 🙏" : "คุณรีวิวไปแล้ว ขอบคุณครับ"}
      </h2>
      <p className="mx-auto mt-1 max-w-[320px] text-sm leading-relaxed text-text-muted">
        {fresh
          ? "รีวิวของคุณขึ้นแสดงบนหน้ารีวิวของร้านแล้ว ช่วยให้ลูกค้าคนอื่นมั่นใจขึ้นมากเลยครับ"
          : "ลิงก์นี้ใช้รีวิวได้ครั้งเดียว ขอบคุณที่สละเวลาให้ร้านนะครับ"}
      </p>
      {review && <div className="mt-5 text-left"><ReviewCard review={review} /></div>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onClose} className="btn-primary h-11 justify-center">ดูรีวิวทั้งหมด</button>
        <Link href="/" className="btn-ghost h-11 justify-center">ไปหน้าแรกร้าน</Link>
      </div>
    </div>
  );
}

/** ลิงก์หมดอายุ / ถูกยกเลิก / ไม่พบ — บอกทางไปต่อเสมอ (ทัก LINE ขอลิงก์ใหม่) */
function Closed({ status, onClose }: { status: string; onClose: () => void }) {
  const copy = status === "EXPIRED"
    ? { icon: Clock, title: "ลิงก์รีวิวหมดอายุแล้ว", desc: "ทักแอดมินทาง LINE เพื่อขอลิงก์ใหม่ได้เลยครับ ยินดีรับฟังทุกความเห็น" }
    : status === "REVOKED"
      ? { icon: Link2Off, title: "ลิงก์นี้ถูกยกเลิกแล้ว", desc: "หากต้องการรีวิว ทักแอดมินทาง LINE เพื่อขอลิงก์ใหม่ได้เลยครับ" }
      : { icon: Link2Off, title: "ไม่พบลิงก์รีวิวนี้", desc: "ลิงก์อาจคัดลอกมาไม่ครบ ลองเปิดจากข้อความเดิมอีกครั้ง หรือทักแอดมินทาง LINE ครับ" };
  const Icon = copy.icon;
  return (
    <div className="text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bg-subtle text-text-muted"><Icon size={30} /></span>
      <h2 id="review-popup-title" className="mt-4 font-display text-xl font-bold text-text-heading">{copy.title}</h2>
      <p className="mx-auto mt-1 max-w-[320px] text-sm leading-relaxed text-text-muted">{copy.desc}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
           className="btn-primary h-11 justify-center border-line bg-line text-white hover:bg-line/90">
          <MessageCircle size={16} /> ทัก LINE ร้าน
        </a>
        <button type="button" onClick={onClose} className="btn-ghost h-11 justify-center">ดูรีวิวร้าน</button>
      </div>
    </div>
  );
}
