"use client";
/* eslint-disable @next/next/no-img-element -- พรีวิว blob: URL ของรูปในเครื่องลูกค้า */
import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Images, Info, MessageCircle, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { LINE_AUTO_PHOTOS, LINE_OA_NAME, lineChatUrl } from "@/lib/contact";
import { shareFilesFor } from "@/lib/serviceRequest";
import type { SubmitDone } from "./useServiceSubmit";

/**
 * หลังบันทึกสำเร็จ — 2 ขั้นตอนส่งเข้า LINE
 *   1) ข้อความ (deep link — แนบได้แค่ "ข้อความ") · มีเลขอ้างอิง + ลิงก์ดูรูปทั้งหมด (LINE แสดงการ์ดพรีวิว)
 *   2) รูปเครื่อง → แชท LINE ผ่าน share sheet ของมือถือ (ลูกค้าเลือก LINE → แชทร้าน) = รูปจริงเข้าแชท
 *
 * ทำไมไม่ส่งรูปให้อัตโนมัติ: LINE OA ของร้านไม่มี Messaging API (bot) → เซิร์ฟเวอร์ส่งรูปเข้าแชทแทนลูกค้าไม่ได้
 * และลิงก์ LINE พาไฟล์ไปไม่ได้ · ถ้าเครื่องแชร์ไฟล์ไม่ได้ (คอมพิวเตอร์ ฯลฯ) ลิงก์ในข้อความยังพาแอดมินไปดูรูปได้เสมอ
 * ใช้ <a>/ปุ่มที่ลูกค้ากดเอง (ไม่ window.open/share หลัง await) → ไม่โดนบล็อก popup / user activation
 */
export default function SubmitSuccess({ done, onNew }: { done: SubmitDone; onNew?: () => void }) {
  const { res, message, shareFiles, shareLabels, previews } = done;
  const [shared, setShared] = useState(false);

  // เตรียมไฟล์ไว้ก่อนกด — navigator.share ต้องถูกเรียก "ทันที" ในจังหวะกด (ห้ามมีงาน async คั่น)
  const files = useMemo(() => shareFilesFor(shareFiles, shareLabels, res.refCode), [shareFiles, shareLabels, res.refCode]);
  const canShareFiles = files.length > 0 && typeof navigator !== "undefined"
    && typeof navigator.canShare === "function" && navigator.canShare({ files });

  const copy = () => navigator.clipboard?.writeText(message).then(
    () => toast.success("คัดลอกแล้ว — วางในแชท LINE ได้เลย"),
    () => toast.error("คัดลอกอัตโนมัติไม่ได้ — ลากคลุมข้อความในกล่องแล้วคัดลอกเองได้"),
  );

  const sharePhotos = async () => {
    try {
      // ส่ง "ไฟล์อย่างเดียว" — iOS บางแอปทิ้งรูปถ้าแนบข้อความมาด้วย (ข้อความไปทางขั้นตอนที่ 1 แล้ว)
      await navigator.share({ files });
      setShared(true);
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;   // ลูกค้ากดยกเลิกเอง
      toast.error("แชร์รูปไม่สำเร็จ — ไม่เป็นไร แอดมินดูรูปได้จากลิงก์ในข้อความแล้ว");
    }
  };

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

      {/* ขั้นที่ 1 — ข้อความ */}
      <div className="mt-4 rounded-xl bg-white p-4">
        <p className="text-sm font-bold text-text-heading">1. ส่งข้อมูลเข้าแชท LINE</p>
        <a href={lineChatUrl(message)} target="_blank" rel="noopener noreferrer"
          className="line-cta mt-2.5 flex w-full items-center justify-center gap-2 rounded-full bg-line py-3.5 text-base font-bold text-white shadow-[var(--shadow-line)] transition-transform hover:-translate-y-0.5">
          <MessageCircle size={20} /> เปิดแชท LINE ส่งข้อมูลให้แอดมิน
        </a>
      </div>

      {/* ขั้นที่ 2 — รูปเครื่อง (ไม่รวมบัตรประชาชน: ไม่ส่งข้อมูลอ่อนไหวเข้าแชท) */}
      {files.length > 0 && (
        <div className="mt-3 rounded-xl bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-text-heading"><Images size={16} className="text-yellow-hover" /> 2. ส่งรูปเครื่องเข้าแชท ({files.length} รูป)</p>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {previews.map((u, i) => <img key={u} src={u} alt={`รูปที่ ${i + 1}`} className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />)}
          </div>
          {LINE_AUTO_PHOTOS && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-success-bg px-3 py-2 text-xs font-medium text-success-text">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              ส่งข้อความในขั้นที่ 1 แล้ว รูปชุดนี้จะเด้งเข้าแชทให้อัตโนมัติ — ไม่ต้องทำอะไรเพิ่ม
            </p>
          )}
          {canShareFiles ? (
            <>
              {LINE_AUTO_PHOTOS && <p className="mt-2.5 text-xs text-text-muted">ถ้ารูปไม่ขึ้นในแชทภายใน 1 นาที กดแชร์เองได้:</p>}
              <button type="button" onClick={sharePhotos}
                className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-base font-bold transition-colors ${shared ? "border border-success-border bg-success-bg text-success-text" : LINE_AUTO_PHOTOS ? "border border-border-default bg-white text-text-heading" : "btn-primary"}`}>
                {shared ? <><CheckCircle2 size={18} /> แชร์รูปแล้ว (กดอีกครั้งได้)</> : <><Share2 size={18} /> แชร์รูปเข้า LINE</>}
              </button>
              <p className="mt-2 text-xs text-text-muted">
                กดแล้วเลือก <span className="font-semibold text-text-heading">LINE</span> → เลือกแชท{" "}
                <span className="font-semibold text-text-heading">“{LINE_OA_NAME}”</span> → กดส่ง
              </p>
            </>
          ) : LINE_AUTO_PHOTOS ? null : (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-text-muted">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              อุปกรณ์นี้แชร์รูปเข้า LINE โดยตรงไม่ได้ — ไม่ต้องกังวล ในข้อความมีลิงก์ให้แอดมินเปิดดูรูปทั้งหมดแล้ว
            </p>
          )}
        </div>
      )}

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
