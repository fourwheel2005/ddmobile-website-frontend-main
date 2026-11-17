/**
 * รูปรีวิว (รูปลูกค้ารับเครื่อง / แคปรีวิว) — พนักงานอัปในหลังบ้าน › รีวิว Facebook + รูปรีวิว
 * backend: GET /review-photos (สาธารณะ เฉพาะที่เปิดแสดง ตามลำดับ) · /admin/review-photos/** (จัดการ)
 * แสดง: แถบรูปเลื่อนวนหน้าแรก + แกลเลอรีหน้า /reviews
 */
export interface ReviewPhoto { id: number; url: string; width: number; height: number; caption: string | null; }
export interface ReviewPhotoList { photos: ReviewPhoto[]; }
export interface AdminReviewPhoto extends ReviewPhoto { visible: boolean; sortOrder: number; }
export interface AdminReviewPhotoList { maxPhotos: number; photos: AdminReviewPhoto[]; }

export const MAX_CAPTION = 120;
/** แถบเลื่อนวนต้องมีรูปอย่างน้อยเท่านี้ — น้อยกว่านี้ = แถวปัดเอง (วนรูปเดิม 2–3 รูปดูซ้ำชัด) */
export const MARQUEE_MIN_PHOTOS = 3;
/** ชุดหนึ่งรอบต้องยาวกว่าจอกว้าง ไม่งั้นเห็นช่องว่างก่อนวนกลับ */
const MIN_LOOP_TILES = 10;

/** สัดส่วนกว้าง/สูงของกรอบรูปในแถบ — รูปแนวตั้งสุด/แนวนอนสุดไม่ให้แคบหรือยาวเกินไป */
export function tileAspect(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 1;
  return Math.min(1.6, Math.max(0.6, width / height));
}

/** ชุดรูปหนึ่งรอบของแถบเลื่อนวน — รูปน้อยให้ทวนจนยาวพอ (แต่ละชิ้นมี key ไม่ซ้ำ) */
export function loopSet<T extends { id: number }>(photos: T[]): { key: string; photo: T }[] {
  if (photos.length === 0) return [];
  const rounds = Math.max(1, Math.ceil(MIN_LOOP_TILES / photos.length));
  return Array.from({ length: rounds }, (_, r) => photos.map((p) => ({ key: `${r}-${p.id}`, photo: p }))).flat();
}

/** ~4.5 วินาทีต่อรูป (เห็นทันแต่ยังรู้สึกว่าเคลื่อน) · ขั้นต่ำ 30 วิ */
export function loopDuration(tiles: number): number {
  return Math.max(30, Math.round(tiles * 4.5));
}
