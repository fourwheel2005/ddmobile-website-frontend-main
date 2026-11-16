import { FACEBOOK_URL } from "@/lib/contact";

/**
 * รีวิวจากเพจโซเชียลของร้าน (Facebook "แนะนำ" ฯลฯ) — แอดมินคัดลอกข้อความมาลงในหลังบ้าน
 * backend: GET /social-reviews (สาธารณะ เฉพาะที่เปิดแสดง ตามลำดับ) · /admin/social-reviews/** (จัดการ)
 * ไม่มีดาว — แยกจากรีวิวผู้ซื้อบนเว็บ (lib/reviews.ts) และไม่ปนคะแนนเฉลี่ย
 */
export type SocialSource = "FACEBOOK" | "GOOGLE" | "TIKTOK" | "LINE" | "OTHER";
export const SOCIAL_SOURCES: SocialSource[] = ["FACEBOOK", "GOOGLE", "TIKTOK", "LINE", "OTHER"];

export const SOURCE_LABEL: Record<SocialSource, string> = {
  FACEBOOK: "Facebook", GOOGLE: "Google", TIKTOK: "TikTok", LINE: "LINE", OTHER: "ช่องทางอื่น",
};

/** หน้ารวมรีวิวบนเพจ Facebook ของร้าน — ลิงก์ "ดูต้นฉบับ" ระดับ section */
export const FACEBOOK_REVIEWS_URL = `${FACEBOOK_URL}/reviews`;

/** หน้าแรกแสดงชุดแรกตามลำดับที่แอดมินจัด */
export const HOME_REVIEW_COUNT = 12;

export interface SocialReviewImage { id: number; url: string; width: number; height: number; }
export interface SocialReview {
  id: number; source: SocialSource; name: string; text: string; recommended: boolean;
  reviewedOn: string | null; sourceUrl: string | null; images: SocialReviewImage[];
}
export interface SocialReviewList { count: number; facebookCount: number; reviews: SocialReview[]; }
export interface AdminSocialReview extends SocialReview { visible: boolean; sortOrder: number; }
export interface AdminSocialReviewList { maxReviews: number; maxImagesPerReview: number; reviews: AdminSocialReview[]; }

const THAI_LEADING_VOWELS = /^[เแโใไ]+/u;

/** อักษรแรกที่ใช้แทนชื่อ — ภาษาไทยข้ามสระหน้า (เ แ โ ใ ไ) ไปเอาพยัญชนะ */
export function initialOf(name: string): string {
  const word = name.trim().replace(THAI_LEADING_VOWELS, "");
  const ch = Array.from(word)[0] ?? "";
  return ch.toLocaleUpperCase("th-TH");
}

/** "Paphawee Sorndech" → "Paphawee S." · "ชายพเนจร ไปเลื่อย" → "ชายพเนจร ป." · คำเดียว/ย่อแล้ว = คงเดิม */
export function abbreviateName(full: string): string {
  const words = full.trim().split(/\s+/u).filter(Boolean);
  if (words.length < 2) return words[0] ?? "";
  const last = words[words.length - 1];
  if (/\.$/u.test(last) && Array.from(last).length <= 3) return words.join(" ");
  return `${words[0]} ${initialOf(last)}.`;
}

/** "2026-02-15" → "15 ก.พ. 2569" (วันที่บนต้นทาง ไม่มีเวลา — ไม่ให้เขตเวลาเลื่อนวัน) */
export function formatReviewDate(iso: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** วันนี้ตามเวลาไทย (YYYY-MM-DD) — เพดานช่องวันที่รีวิว (backend ไม่รับวันในอนาคต) */
export function todayInBangkok(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** ตรงกับ backend SocialReviewService.LINK_HOSTS — เตือนในฟอร์มก่อนกดบันทึก */
const LINK_HOSTS = new Set([
  "facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "www.fb.com", "fb.watch",
  "google.com", "www.google.com", "google.co.th", "www.google.co.th", "maps.google.com", "maps.app.goo.gl", "g.page",
  "tiktok.com", "www.tiktok.com", "vt.tiktok.com", "line.me", "lin.ee",
]);

export function isSocialLink(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    const host = u.hostname.toLowerCase();
    if (!LINK_HOSTS.has(host)) return false;
    const googleSearch = (host.endsWith("google.com") && host !== "maps.google.com") || host.endsWith("google.co.th");
    return !googleSearch || u.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

/** ลิงก์ "ดูต้นฉบับ" ของ section — ลิงก์ของรีวิวแรกที่มี ไม่มีเลยใช้หน้ารีวิว Facebook ของร้าน */
export function sectionSourceUrl(reviews: SocialReview[]): string {
  return reviews.find((r) => r.source === "FACEBOOK" && r.sourceUrl)?.sourceUrl ?? FACEBOOK_REVIEWS_URL;
}
