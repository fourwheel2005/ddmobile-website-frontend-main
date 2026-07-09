"use client";
import { useEffect, useState } from "react";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";

interface Review { rating: number; comment: string | null; }

/** สถานะที่รีวิวได้ (รับของแล้ว) — ต้องตรงกับ REVIEWABLE ฝั่ง server */
const REVIEWABLE = ["DELIVERED", "PICKED_UP", "COMPLETED"];

/** กล่องให้คะแนนหลังได้รับสินค้า — 1 ออเดอร์รีวิวได้ครั้งเดียว (server บังคับอีกชั้น) */
export default function ReviewBox({ orderId, status }: { orderId: number; status: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canReview = REVIEWABLE.includes(status);

  useEffect(() => {
    if (!canReview) { setLoading(false); return; }
    api.get(`/reviews/order/${orderId}`)
      .then((r) => setReview(r.status === 204 ? null : r.data))
      .catch(() => { /* โหลดไม่ได้ → โชว์ฟอร์มตามปกติ server กันซ้ำให้ */ })
      .finally(() => setLoading(false));
  }, [orderId, canReview]);

  if (!canReview || loading) return null;

  // รีวิวแล้ว → โชว์ดาวที่ให้ + ขอบคุณ
  if (review) {
    return (
      <div className="card-dd mt-6">
        <div className="flex items-center gap-2 text-success-text"><CheckCircle2 size={18} /><h3 className="font-bold text-text-heading">รีวิวของคุณ</h3></div>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={22} className={i <= review.rating ? "fill-yellow text-yellow" : "text-border-default"} />
          ))}
        </div>
        {review.comment && <p className="mt-2 text-sm text-text-body">“{review.comment}”</p>}
        <p className="mt-2 text-xs text-text-muted">ขอบคุณที่รีวิวให้ DD Mobile</p>
      </div>
    );
  }

  const submit = async () => {
    if (rating < 1) { toast.error("เลือกจำนวนดาวก่อนส่งรีวิว"); return; }
    setSubmitting(true);
    try {
      const res = await api.post("/reviews", { orderId, rating, comment: comment.trim() || null });
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
      <p className="mt-0.5 text-xs text-text-muted">รีวิวของคุณช่วยลูกค้าคนถัดไปตัดสินใจ</p>
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
      <button onClick={submit} disabled={submitting} className="btn-primary mt-3">
        {submitting ? <><Loader2 size={16} className="animate-spin" /> กำลังส่ง</> : "ส่งรีวิว"}
      </button>
    </div>
  );
}
