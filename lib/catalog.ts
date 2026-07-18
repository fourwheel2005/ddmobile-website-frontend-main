import api from "@/lib/api";

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

export async function getCatalogItem<T extends { id: string } = CatalogRecord>(id: string): Promise<T | null> {
  const items = await getCatalog<T>();
  return items.find((item) => item.id === id) ?? null;
}
