"use client";
import { MessageCircle, RotateCcw } from "lucide-react";
import { LINE_URL } from "@/lib/contact";

/**
 * โหลดหน้า Landing ไม่ได้ชั่วคราว (เซิร์ฟเวอร์ล่ม/รีสตาร์ต) — ไม่ใช่ 404: ให้ลองใหม่ หรือทักไลน์ต่อได้ทันที ลูกค้าจากแอดไม่หลุด
 * "ลองใหม่" = โหลดหน้าใหม่ทั้งหน้า (reset() ของ Next แค่วาดผลเดิมที่ error ซ้ำ ไม่ได้ขอข้อมูลใหม่จากเซิร์ฟเวอร์)
 */
export default function CampaignError() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-text-heading">โหลดหน้านี้ไม่สำเร็จ</h1>
      <p className="text-text-body">ระบบกำลังอัปเดตอยู่ ลองใหม่อีกครั้ง หรือทักไลน์คุยกับแอดมินได้เลย</p>
      <button type="button" onClick={() => window.location.reload()} className="btn-secondary"><RotateCcw size={16} /> ลองใหม่</button>
      <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
         className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-line px-5 font-display font-bold text-white shadow-[var(--shadow-line)]">
        <MessageCircle size={20} /> ทักไลน์แอดมิน
      </a>
    </section>
  );
}
