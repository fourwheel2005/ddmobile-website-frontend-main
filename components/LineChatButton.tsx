"use client";
import { useEffect, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { loadLineStatus, oaChatUrl, type LineStatus } from "@/lib/lineChat";

/** ปุ่มเปิดห้องแชทของลูกค้าใน LINE OA Manager · ยังไม่ผูก LINE = ไปหน้ารวมแชท + บอกเหตุผล */
export function LineChatButton({ lineUserId }: { lineUserId: string | null | undefined }) {
  const status = useLineStatus();
  const linked = !!lineUserId;
  return (
    <a href={oaChatUrl(status, lineUserId)} target="_blank" rel="noopener noreferrer"
       title={linked ? "เปิดห้องแชทของลูกค้าคนนี้ใน LINE OA Manager — เห็นข้อความทั้งหมดและตอบได้ทันที" : "ลูกค้ายังไม่ได้ทักแชทพร้อมเลขอ้างอิง — เปิดหน้ารวมแชทแล้วค้นชื่อ LINE"}
       className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-90 ${linked ? "bg-line text-white" : "border border-border-default bg-white text-text-muted"}`}>
      <MessageCircle size={13} /> {linked ? "เปิดแชทลูกค้า" : "แชท OA (ลูกค้ายังไม่ทัก)"}
    </a>
  );
}

/**
 * ชื่อ LINE + LINE userId ของลูกค้า (ผูกเมื่อลูกค้าทักแชทพร้อมเลขอ้างอิง)
 * LINE ไม่เปิดให้ระบบอ่าน "LINE ID" ที่ผู้ใช้ตั้งเอง (@xxx) — userId (U…) คือรหัสประจำตัวลูกค้าในแชทร้าน
 */
export function LineIdentity({ lineUserId, lineDisplayName }: { lineUserId: string | null | undefined; lineDisplayName?: string | null }) {
  if (!lineUserId) return <p className="mt-0.5 text-xs text-text-muted">LINE: ลูกค้ายังไม่ได้ทักแชทพร้อมเลขอ้างอิง</p>;
  const copy = () => navigator.clipboard?.writeText(lineUserId).then(() => toast.success("คัดลอก LINE userId แล้ว"), () => toast.error("คัดลอกไม่สำเร็จ"));
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-muted">
      <MessageCircle size={12} className="text-line" />
      <span>ชื่อ LINE:</span> <b className="text-text-heading">{lineDisplayName ?? "—"}</b>
      <span aria-hidden>·</span>
      <span title="รหัสลูกค้าใน LINE ของร้าน (LINE ไม่เปิดให้ระบบอ่าน LINE ID ที่ลูกค้าตั้งเอง)">LINE userId:</span>
      <code className="rounded bg-bg-subtle px-1 font-mono text-[11px] text-text-body">{lineUserId}</code>
      <button type="button" onClick={copy} aria-label="คัดลอก LINE userId" className="rounded p-0.5 hover:bg-bg-subtle"><Copy size={12} /></button>
    </p>
  );
}

export function useLineStatus(): LineStatus | null {
  const [status, setStatus] = useState<LineStatus | null>(null);
  useEffect(() => { loadLineStatus().then(setStatus); }, []);
  return status;
}

/** แถบเตือนเมื่อแชท 1:1 ของ OA ปิดอยู่ — ปิด = ข้อความลูกค้าไม่ขึ้นใน OA Manager แอดมินตอบไม่ได้ */
export function LineChatOffBanner() {
  const status = useLineStatus();
  if (status?.chatMode !== "bot") return null;
  return (
    <div role="alert" className="mb-4 rounded-2xl border border-error-border bg-error-bg p-4 text-sm text-text-body">
      <p className="font-bold text-error-text">⚠️ แชทของ LINE OA ปิดอยู่ — ข้อความลูกค้าจะไม่ขึ้นในแชท แอดมินตอบไม่ได้</p>
      <p className="mt-1">เปิดที่ <b>LINE Official Account Manager › ตั้งค่า › การตอบกลับ</b> → เปิด <b>แชท</b> และเปิด <b>Webhook</b> ไว้ทั้งคู่ (ปิด &ldquo;ข้อความตอบกลับอัตโนมัติ&rdquo; เพื่อไม่ให้ตอบซ้ำกับระบบ)</p>
    </div>
  );
}
