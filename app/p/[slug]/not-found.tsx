import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LINE_URL } from "@/lib/contact";

/**
 * หน้า Landing ไม่มี/ปิดไปแล้ว (แอดเก่ายังวิ่ง, ลิงก์พิมพ์ผิด) — หน้านี้ไม่มีเมนูเว็บ จึงต้องมีทางไปต่อเอง:
 * ทักไลน์ หรือ ไปหน้าแรก (ไม่ทิ้งลูกค้าไว้ที่หน้า 404 ภาษาอังกฤษของ Next)
 */
export default function CampaignNotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-text-heading">โปรนี้ปิดไปแล้ว หรือไม่พบหน้านี้</h1>
      <p className="text-text-body">ทักไลน์ถามโปรล่าสุดกับแอดมินได้เลย หรือดูบริการทั้งหมดที่หน้าแรก</p>
      <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
         className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-line px-5 font-display font-bold text-white shadow-[var(--shadow-line)]">
        <MessageCircle size={20} /> ทักไลน์แอดมิน
      </a>
      <Link href="/" className="btn-secondary">ไปหน้าแรก DD Mobile</Link>
    </section>
  );
}
