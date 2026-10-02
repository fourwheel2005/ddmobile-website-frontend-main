"use client";
import { CheckCircle2, Copy, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { lineChatUrl } from "@/lib/contact";
import type { SubmitDone } from "./useServiceSubmit";

/**
 * หลังบันทึกสำเร็จ — ปุ่มเปิดแชท LINE พร้อมข้อความ (มีเลขอ้างอิงให้แอดมินเปิดรูป/บัตรในหลังบ้าน)
 * ใช้ <a> ไม่ใช่ window.open หลัง await → ไม่โดนบล็อก popup บนมือถือ
 * มีกล่องข้อความสำรองเสมอ: เดสก์ท็อปที่ไม่มีแอป LINE จะเด้งหน้า QR แล้วข้อความหาย
 */
export default function SubmitSuccess({ done, onNew }: { done: SubmitDone; onNew?: () => void }) {
  const { res, message } = done;
  const copy = () => navigator.clipboard?.writeText(message).then(
    () => toast.success("คัดลอกแล้ว — วางในแชท LINE ได้เลย"),
    () => toast.error("คัดลอกอัตโนมัติไม่ได้ — ลากคลุมข้อความในกล่องแล้วคัดลอกเองได้"),
  );

  return (
    <div className="rounded-2xl border-2 border-success-border bg-success-bg/40 p-5" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-lg font-bold text-text-heading">
        <CheckCircle2 size={22} className="text-success-text" /> ส่งข้อมูลเรียบร้อย
      </p>
      <p className="mt-1 text-sm text-text-body">
        เลขอ้างอิง <span className="rounded-md bg-white px-2 py-0.5 font-mono font-bold text-text-heading">{res.refCode}</span>
        {res.photoCount > 0 && <> · รูปเครื่อง {res.photoCount} รูป</>}
        {res.idCardAttached && <> · บัตรประชาชน ✓</>}
      </p>
      <p className="mt-3 text-sm font-semibold text-text-heading">ขั้นตอนสุดท้าย: กดส่งข้อความทาง LINE เพื่อให้แอดมินติดต่อกลับ</p>

      <a href={lineChatUrl(message)} target="_blank" rel="noopener noreferrer"
        className="line-cta mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-line py-3.5 text-base font-bold text-white shadow-[var(--shadow-line)] transition-transform hover:-translate-y-0.5">
        <MessageCircle size={20} /> เปิดแชท LINE ส่งข้อมูลให้แอดมิน
      </a>

      <details className="mt-3 rounded-xl border border-border-default bg-white p-3">
        <summary className="cursor-pointer text-xs font-semibold text-text-muted">ข้อความไม่ขึ้นในแชท? ดู/คัดลอกข้อความ</summary>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-text-body">{message}</pre>
        <button type="button" onClick={copy} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border-default px-4 py-2 text-xs font-bold text-text-heading hover:border-yellow">
          <Copy size={14} /> คัดลอกข้อความ
        </button>
      </details>

      {onNew && (
        <button type="button" onClick={onNew} className="mt-3 w-full text-center text-xs font-semibold text-text-muted hover:text-text-heading">
          ส่งคำขออื่นเพิ่ม
        </button>
      )}
    </div>
  );
}
