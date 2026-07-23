import api from "@/lib/api";
import { getApiStatus } from "@/lib/errorMessage";

/**
 * Catalog data boundary สำหรับ customer-facing pages
 *
 * ข้อมูล catalog ถูกใช้พร้อมกันใน Home, Product list และ Product detail.
 * module cache นี้ช่วย dedupe request ระหว่างการเปลี่ยนหน้า client-side โดยยังเก็บ
 * อายุสั้น เพื่อไม่ให้คำว่า "สต็อกเรียลไทม์" ล้าสมัยเกินควร.
 */
export interface CatalogRecord {
  id: string;
  [key: string]: unknown;
}

const CATALOG_TTL_MS = 20_000;

let cache: CatalogRecord[] | null = null;
let cachedAt = 0;
let inFlight: Promise<CatalogRecord[]> | null = null;

// endpoint เฉพาะสินค้า /catalog/{id} มีให้ใช้ไหม (auto-detect ต่อ session):
//   null = ยังไม่รู้ · true = backend มีแล้ว · false = ยังไม่มี (เลิกยิงกัน 404 ซ้ำ)
// เมื่อ backend เพิ่ม endpoint นี้ ระบบจะเริ่มใช้อัตโนมัติโดยไม่ต้องแก้โค้ด
let itemEndpointAvailable: boolean | null = null;

export function invalidateCatalog() {
  cache = null;
  cachedAt = 0;
}

export async function getCatalog<T extends { id: string } = CatalogRecord>(options: { force?: boolean } = {}): Promise<T[]> {
  const fresh = cache && Date.now() - cachedAt < CATALOG_TTL_MS;
  if (!options.force && fresh) return cache as T[];

  if (!inFlight) {
    inFlight = api.get("/catalog")
      .then((response) => Array.isArray(response.data) ? response.data as CatalogRecord[] : [])
      .then((items) => {
        cache = items;
        cachedAt = Date.now();
        return items;
      })
      .finally(() => { inFlight = null; });
  }

  return (await inFlight) as T[];
}

/**
 * ดึงสินค้าชิ้นเดียวตาม id — เลือกทางที่ถูกที่สุดอัตโนมัติ:
 *   1) catalog cache ยังสด (browse → detail) → ใช้เลย ไม่ยิง network ซ้ำ
 *   2) cache เย็น (เข้า detail ตรงจาก URL/แชร์ลิงก์) → ยิง /catalog/{id} (เล็กกว่าโหลดทั้งก้อน 74KB)
 *      ถ้า backend ยังไม่มี endpoint นี้ (404) → จำไว้แล้ว fallback เป็น catalog ทั้งก้อน (ไม่ยิงซ้ำ)
 */
export async function getCatalogItem<T extends { id: string } = CatalogRecord>(id: string): Promise<T | null> {
  // 1) cache สด → หาในนั้นก่อน (เร็วสุด, 0 network)
  if (cache && Date.now() - cachedAt < CATALOG_TTL_MS) {
    const hit = (cache as T[]).find((item) => item.id === id);
    if (hit) return hit;
  }

  // 2) cache เย็น → ลอง endpoint เฉพาะสินค้า (ยกเว้นเคยเจอ 404 = backend ยังไม่มี)
  if (itemEndpointAvailable !== false) {
    try {
      const res = await api.get(`/catalog/${encodeURIComponent(id)}`);
      const data = res.data as T | undefined;
      if (data && typeof data === "object" && typeof data.id === "string") {
        itemEndpointAvailable = true;
        return data;
      }
    } catch (err) {
      // 404 → endpoint ยังไม่มี: เลิกลองใน session นี้ (error อื่นเช่น network → ไม่ปิด, fallback ต่อ)
      if (getApiStatus(err) === 404) itemEndpointAvailable = false;
    }
  }

  // 3) fallback: โหลด catalog ทั้งก้อนแล้วหา
  const items = await getCatalog<T>();
  return items.find((item) => item.id === id) ?? null;
}
