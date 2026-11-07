"use client";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
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
