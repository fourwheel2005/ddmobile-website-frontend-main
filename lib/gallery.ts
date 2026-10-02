/**
 * ลิงก์ดูรูปเครื่องที่ลูกค้าแนบ (/r/{token}) — ใช้ใน server component (หน้า + og:image ให้การ์ดพรีวิว LINE)
 * backend: GET /public/gallery/{token} (ไม่มี PII) · รูป JPEG ≤ 1280px ที่ /public/gallery/{token}/photos/{id}
 */
import { PHOTO_SLOTS } from "@/lib/serviceRequest";

export const GALLERY_API = (process.env.NEXT_PUBLIC_API_URL || "https://ddmobilewebsite.fourwheel.in.th/api/v1").replace(/\/+$/, "");
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

export interface GalleryPhoto { id: number; slot: string; }
export interface Gallery {
  refCode: string; serviceType: string; model: string; storage: string; createdAt: string; photos: GalleryPhoto[];
}
export type GalleryResult = { kind: "ok"; gallery: Gallery } | { kind: "expired" } | { kind: "missing" };

export const isGalleryToken = (t: string) => TOKEN_RE.test(t);
export const galleryPhotoUrl = (token: string, id: number) => `${GALLERY_API}/public/gallery/${token}/photos/${id}`;
export const slotLabel = (slot: string) => PHOTO_SLOTS.find((m) => m.slot === slot)?.label ?? "รูปเพิ่มเติม";

/** ดึงข้อมูลลิงก์ — token ผิดรูปไม่ยิง backend เลย · cache 5 นาที (หน้า + metadata ใช้ fetch เดียวกัน) */
export async function loadGallery(token: string): Promise<GalleryResult> {
  if (!isGalleryToken(token)) return { kind: "missing" };
  try {
    const res = await fetch(`${GALLERY_API}/public/gallery/${token}`, { next: { revalidate: 300 } });
    if (res.status === 410) return { kind: "expired" };
    if (!res.ok) return { kind: "missing" };
    return { kind: "ok", gallery: (await res.json()) as Gallery };
  } catch {
    return { kind: "missing" };
  }
}
