"use client";
import { useEffect, useState } from "react";
import { Star, MessageSquareReply, Trash2, X, Loader2, ThumbsUp } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { TableSkeleton } from "@/components/Skeletons";

interface AdminReview {
  id: number; orderId: number; customerName: string; customerEmail: string;
  rating: number; comment: string | null; productName: string | null; variantLabel: string | null;
  images: string[]; helpfulCount: number; adminReply: string | null; createdAt: string | null;
}

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className={i <= n ? "fill-yellow text-yellow" : "text-border-default"} />)}
  </span>
);

/** จัดการรีวิวลูกค้า: ดูทั้งหมด · ตอบกลับ (Seller Response) · ลบรีวิวไม่เหมาะสม */
export default function ReviewAdmin() {
  const [list, setList] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/admin/reviews").then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("โหลดรีวิวไม่สำเร็จ")).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openReply = (r: AdminReview) => { setReplying(r); setReplyText(r.adminReply ?? ""); };

  const saveReply = async () => {
    if (!replying || !replyText.trim()) { toast.error("พิมพ์ข้อความตอบกลับก่อน"); return; }
    setSaving(true);
    try {
      await api.post(`/admin/reviews/${replying.id}/reply`, { reply: replyText.trim() });
      toast.success("ตอบกลับแล้ว");
      setReplying(null); load();
    } catch (e) { toast.error(getApiError(e, "ตอบกลับไม่สำเร็จ")); }
    finally { setSaving(false); }
  };

  const del = async (r: AdminReview) => {
    if (!(await confirmDialog({ title: "ลบรีวิวนี้?", message: `${r.customerName} · ${r.productName ?? ""} (${r.rating} ดาว)`, confirmText: "ลบรีวิว", danger: true }))) return;
    try { await api.delete(`/admin/reviews/${r.id}`); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  };

  if (loading) return <div className="overflow-hidden rounded-2xl border border-border-default bg-white"><TableSkeleton rows={6} cols={6} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-border-default bg-white p-4">
        <Star className="fill-yellow text-yellow" size={20} />
        <h2 className="font-display text-xl">รีวิวลูกค้า</h2>
        <span className="badge-dd badge-warning">{list.length} รีวิว</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
        <div className="max-h-[70vh] overflow-auto">
          <table className="table-dd">
            <thead><tr><th>ลูกค้า / ออเดอร์</th><th>สินค้า</th><th>คะแนน</th><th>รีวิว</th><th className="text-center">โหวต</th><th className="text-right">จัดการ</th></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-text-muted">ยังไม่มีรีวิวจากลูกค้า</td></tr>
              ) : list.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-semibold text-text-heading">{r.customerName}</p>
                    <p className="text-xs text-text-muted">#{r.orderId} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString("th-TH") : ""}</p>
                  </td>
                  <td><p className="max-w-[160px] truncate text-sm">{r.productName ?? "-"}</p><p className="text-xs text-text-muted">{r.variantLabel}</p></td>
                  <td><Stars n={r.rating} /></td>
                  <td className="max-w-[260px]">
                    {r.comment ? <p className="line-clamp-2 text-sm text-text-body">{r.comment}</p> : <span className="text-xs text-text-muted">— ให้ดาวอย่างเดียว —</span>}
                    {r.images.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {r.images.map((src) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={src} src={src} alt="รูปรีวิว" className="h-9 w-9 rounded border border-border-default object-cover" />
                        ))}
                      </div>
                    )}
                    {r.adminReply && <p className="mt-1 line-clamp-1 text-xs text-success-text">ตอบแล้ว: {r.adminReply}</p>}
                  </td>
                  <td className="text-center"><span className="inline-flex items-center gap-1 text-xs text-text-muted"><ThumbsUp size={11} /> {r.helpfulCount}</span></td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openReply(r)} aria-label="ตอบกลับ" className="rounded-lg border border-info-border bg-info-bg p-1.5 text-info-text hover:bg-info-text hover:text-white"><MessageSquareReply size={14} /></button>
                      <button onClick={() => del(r)} aria-label="ลบ" className="rounded-lg border border-error-border bg-error-bg p-1.5 text-error-text hover:bg-error-text hover:text-white"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal ตอบกลับรีวิว */}
      {replying && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setReplying(null)}>
          <div className="modal-dd w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setReplying(null)} className="modal-close" aria-label="ปิด"><X size={20} /></button>
            <h2 className="card-title">ตอบกลับรีวิว</h2>
            <div className="mt-3 rounded-xl bg-bg-subtle p-3 text-sm">
              <Stars n={replying.rating} />
              <p className="mt-1 text-text-body">{replying.comment ?? "— ให้ดาวอย่างเดียว —"}</p>
              <p className="mt-1 text-xs text-text-muted">{replying.customerName} · {replying.productName}</p>
            </div>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={500} rows={4}
                      placeholder="ขอบคุณที่อุดหนุนครับ..." className="input-dd mt-3 resize-none" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReplying(null)} className="btn-ghost">ยกเลิก</button>
              <button onClick={saveReply} disabled={saving} className="btn-primary">
                {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังส่ง</> : "ส่งคำตอบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
