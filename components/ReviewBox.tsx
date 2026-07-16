"use client";
import { useEffect, useRef, useState } from "react";
import { Star, CheckCircle2, Loader2, Camera, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";

interface Review { rating: number; comment: string | null; images: string[]; adminReply: string | null; }

/** สถานะที่รีวิวได้ (รับของแล้ว) — ต้องตรงกับ REVIEWABLE ฝั่ง server */
const REVIEWABLE = ["DELIVERED", "PICKED_UP", "COMPLETED"];
const MAX_IMAGES = 3;

/** กล่องให้คะแนนหลังได้รับสินค้า (Verified Purchase) — ดาว + ความเห็น + รูปสูงสุด 3 · 1 ออเดอร์รีวิวครั้งเดียว */
export default function ReviewBox({ orderId, status }: { orderId: number; status: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canReview = REVIEWABLE.includes(status);

  useEffect(() => {
    if (!canReview) { setLoading(false); return; }
    api.get(`/reviews/order/${orderId}`)
      .then((r) => setReview(r.status === 204 ? null : r.data))
      .catch(() => { /* โหลดไม่ได้ → โชว์ฟอร์มตามปกติ server กันซ้ำให้ */ })
      .finally(() => setLoading(false));
  }, [orderId, canReview]);

  // คืน object URL "เฉพาะตอน unmount" — ห้ามผูก deps กับ photos (จะ revoke รูปที่ยังโชว์อยู่)
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => { photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)); }, []);

  if (!canReview || loading) return null;

  // รีวิวแล้ว → โชว์สิ่งที่ให้ไว้
  if (review) {
    return (
      <div className="card-dd mt-6">
        <div className="flex items-center gap-2 text-success-text"><CheckCircle2 size={18} /><h3 className="font-bold text-text-heading">รีวิวของคุณ</h3></div>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={22} className={i <= review.rating ? "fill-yellow text-yellow" : "text-border-default"} />
          ))}
        </div>
        {review.comment && <p className="mt-2 text-sm text-text-body">"{review.comment}"</p>}
        {review.images?.length > 0 && (
          <div className="mt-2 flex gap-2">
            {review.images.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="รูปรีวิว" className="h-16 w-16 rounded-lg border border-border-default object-cover" />
            ))}
          </div>
        )}
        {review.adminReply && (
          <div className="mt-3 rounded-xl bg-bg-tinted p-3 text-sm">
            <p className="text-xs font-bold text-text-heading">การตอบกลับจากร้าน</p>
            <p className="mt-0.5 text-text-body">{review.adminReply}</p>
          </div>
        )}
        <p className="mt-2 text-xs text-text-muted">ขอบคุณที่รีวิวให้ DD Mobile — รีวิวของคุณช่วยลูกค้าคนถัดไป</p>
      </div>
    );
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const next: { file: File; preview: string }[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) { toast.error(`"${f.name}" ไม่ใช่ไฟล์รูป`); continue; }
      const compressed = await compressImage(f);
      next.push({ file: compressed, preview: URL.createObjectURL(compressed) });
    }
    // cap ภายใน functional update — เรียกซ้อนกันยังไงก็ไม่เกิน MAX (ตัวเกินถูก revoke ทิ้ง)
    setPhotos((prev) => {
      const merged = [...prev, ...next];
      const kept = merged.slice(0, MAX_IMAGES);
      merged.slice(MAX_IMAGES).forEach((x) => URL.revokeObjectURL(x.preview));
      if (merged.length > MAX_IMAGES) toast(`แนบได้สูงสุด ${MAX_IMAGES} รูป`);
      return kept;
    });
  };

  const submit = async () => {
    if (rating < 1) { toast.error("เลือกจำนวนดาวก่อนส่งรีวิว"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("orderId", String(orderId));
      fd.append("rating", String(rating));
      if (comment.trim()) fd.append("comment", comment.trim());
      photos.forEach((p) => fd.append("images", p.file));
      const res = await api.post("/reviews", fd);
      setReview(res.data);
      toast.success("ขอบคุณสำหรับรีวิว!");
    } catch (e) {
      toast.error(getApiError(e, "ส่งรีวิวไม่สำเร็จ กรุณาลองใหม่"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card-dd mt-6">
      <h3 className="font-bold text-text-heading">ให้คะแนนการซื้อครั้งนี้</h3>
      <p className="mt-0.5 text-xs text-text-muted">รีวิวของคุณช่วยลูกค้าคนถัดไปตัดสินใจ · รีวิวมีรูปช่วยได้มากที่สุด</p>
      <div className="mt-3 flex items-center gap-1.5" onMouseLeave={() => setHoverStar(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" aria-label={`${i} ดาว`}
                  onClick={() => setRating(i)} onMouseEnter={() => setHoverStar(i)}
                  className="p-0.5 transition-transform hover:scale-110">
            <Star size={30} className={i <= (hoverStar || rating) ? "fill-yellow text-yellow" : "text-border-default"} />
          </button>
        ))}
        {rating > 0 && <span className="ml-1 text-sm font-semibold text-text-heading">{rating}/5</span>}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3}
                placeholder="เล่าประสบการณ์เพิ่มเติม (ไม่บังคับ)" className="input-dd mt-3 resize-none" />

      {/* แนบรูป (สูงสุด 3) — รีวิวมีรูปขึ้นเด่นกว่าแบบ Shopee */}
      <div className="mt-3 flex items-center gap-2">
        {photos.map((p, i) => (
          <div key={p.preview} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border-default">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt={`รูปที่ ${i + 1}`} className="h-full w-full object-cover" />
            <button onClick={() => setPhotos((arr) => { URL.revokeObjectURL(arr[i].preview); return arr.filter((_, j) => j !== i); })} aria-label="ลบรูป"
                    className="absolute right-0 top-0 rounded-bl-lg bg-black/60 p-0.5 text-white hover:bg-error-text"><X size={12} /></button>
          </div>
        ))}
        {photos.length < MAX_IMAGES && (
          <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border-default text-text-muted transition-colors hover:border-yellow hover:text-yellow-hover">
            <Camera size={18} /><span className="text-[10px]">เพิ่มรูป</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
               onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
      </div>

      <button onClick={submit} disabled={submitting} className="btn-primary mt-4">
        {submitting ? <><Loader2 size={16} className="animate-spin" /> กำลังส่ง</> : "ส่งรีวิว"}
      </button>
    </div>
  );
}
