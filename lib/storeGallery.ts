/**
 * รูปหน้าร้าน / ทีมงาน / ช่าง / เส้นทางมาร้าน — แอดมินอัปโหลดเองในหลังบ้าน
 * backend: GET /store-gallery (สาธารณะ เฉพาะรูปที่เปิดแสดง) · /admin/store-gallery/** (จัดการ)
 */
export const STORE_API = (process.env.NEXT_PUBLIC_API_URL || "https://ddmobilewebsite.fourwheel.in.th/api/v1").replace(/\/+$/, "");

export type PhotoCategory = "STORE" | "TEAM" | "TECHNICIAN" | "DIRECTIONS";
export const PHOTO_CATEGORIES: PhotoCategory[] = ["STORE", "TEAM", "TECHNICIAN", "DIRECTIONS"];

export interface StorePhoto {
  id: number; category: PhotoCategory; url: string; width: number; height: number;
  title: string | null; subtitle: string | null; visible: boolean; sortOrder: number;
}
export interface StoreProfile {
  address: string | null; landmark: string | null; hours: string | null; mapsUrl: string | null; parking: string | null;
}
export interface StoreGallery { profile: StoreProfile; photos: Record<PhotoCategory, StorePhoto[]>; }

/** ป้าย/คำแนะนำต่อหมวด — ใช้ทั้งหน้าเว็บและหลังบ้าน */
export const CATEGORY_META: Record<PhotoCategory, {
  label: string; anchor: string; aspect: string; hint: string; titlePh: string; subtitlePh: string;
}> = {
  STORE: {
    label: "หน้าร้าน", anchor: "store", aspect: "aspect-[4/3]",
    hint: "ถ่ายแนวนอน แสงสว่าง เห็นป้ายร้าน ตู้โชว์ เคาน์เตอร์ — รูปแรกจะเป็นรูปใหญ่",
    titlePh: "เช่น หน้าร้าน / มุมรับเครื่อง", subtitlePh: "คำอธิบายสั้น ๆ (ไม่บังคับ)",
  },
  TEAM: {
    label: "ทีมงาน", anchor: "team", aspect: "aspect-[4/5]",
    hint: "รูปครึ่งตัวแนวตั้ง หน้าตรง ยิ้ม พื้นหลังเรียบ — ทุกคนถ่ายมุมเดียวกันจะดูเป็นมืออาชีพ",
    titlePh: "ชื่อ เช่น พี่ต้น", subtitlePh: "ตำแหน่ง เช่น ผู้จัดการร้าน",
  },
  TECHNICIAN: {
    label: "ช่างเทคนิค", anchor: "technicians", aspect: "aspect-[4/5]",
    hint: "รูปช่างขณะทำงานหรือครึ่งตัวแนวตั้ง — ใส่ความถนัด/ประสบการณ์ช่วยให้ลูกค้ามั่นใจ",
    titlePh: "ชื่อ เช่น ช่างเอ", subtitlePh: "เช่น ซ่อมจอ/แบต ประสบการณ์ 8 ปี",
  },
  DIRECTIONS: {
    label: "เส้นทางมาร้าน", anchor: "directions", aspect: "aspect-[4/3]",
    hint: "เรียงรูปตามลำดับการเดินทาง (1, 2, 3 …) เช่น ทางเข้าซอย → จุดสังเกต → หน้าร้าน · หรือรูปแผนที่รูปเดียวก็ได้",
    titlePh: "เช่น เข้าซอยข้างธนาคาร", subtitlePh: "รายละเอียดทาง เช่น เดินตรงมา 50 เมตร ร้านอยู่ซ้ายมือ",
  },
};

export const emptyGallery = (): StoreGallery => ({
  profile: { address: null, landmark: null, hours: null, mapsUrl: null, parking: null },
  photos: { STORE: [], TEAM: [], TECHNICIAN: [], DIRECTIONS: [] },
});

/** ข้อมูลหน้าเกี่ยวกับเรา (server component) — cache 60 วินาที · ล่ม = ว่าง (หน้าเว็บยังแสดงส่วนอื่นได้) */
export async function loadStoreGallery(): Promise<StoreGallery> {
  try {
    const res = await fetch(`${STORE_API}/store-gallery`, { next: { revalidate: 60 } });
    if (!res.ok) return emptyGallery();
    const g = (await res.json()) as StoreGallery;
    return { profile: g.profile ?? emptyGallery().profile, photos: { ...emptyGallery().photos, ...g.photos } };
  } catch {
    return emptyGallery();
  }
}

export const hasProfile = (p: StoreProfile) => !!(p.address || p.landmark || p.hours || p.mapsUrl || p.parking);

/**
 * ตาราง "หน้าร้าน" แบบสมมาตรตามจำนวนรูป (โชว์สูงสุด 5 ช่อง ที่เหลือดูในแกลเลอรี)
 *  1 → เต็มกว้าง · 2 → ครึ่ง-ครึ่ง · 3 → ใหญ่ซ้าย + 2 ซ้อนขวา · 4 → 4 ช่องเท่ากัน · 5+ → ใหญ่ซ้าย + 2×2 ขวา
 * คืน class ของกรอบ grid และของแต่ละช่อง
 */
export function bentoLayout(count: number): { grid: string; tiles: string[] } {
  const n = Math.min(count, 5);
  switch (n) {
    case 0: return { grid: "", tiles: [] };
    case 1: return { grid: "grid grid-cols-1", tiles: ["aspect-[4/3] md:aspect-[21/9]"] };
    case 2: return { grid: "grid grid-cols-1 sm:grid-cols-2", tiles: ["aspect-[4/3]", "aspect-[4/3]"] };
    case 3: return {
      grid: "grid grid-cols-2 md:grid-cols-3 md:grid-rows-2",
      tiles: ["col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto", "aspect-[4/3]", "aspect-[4/3]"],
    };
    case 4: return { grid: "grid grid-cols-2 md:grid-cols-4", tiles: Array(4).fill("aspect-[4/3] md:aspect-[3/4]") };
    default: return {
      grid: "grid grid-cols-2 md:grid-cols-4 md:grid-rows-2",
      tiles: ["col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto", ...Array(4).fill("aspect-[4/3]")],
    };
  }
}
