/**
 * ค้นหาที่อยู่ไทย (ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์) — สร้าง index ครั้งเดียวต่อ session แล้วค้นในหน่วยความจำ
 *
 * ทำไมไม่เรียก searchAddressByX ของ thai-address-database ตรง ๆ ทุกครั้งที่พิมพ์:
 *  - lib สร้าง `new RegExp(คำค้น)` ใหม่ "ต่อแถว" (~7,400 แถว × 3 field ต่อการพิมพ์ 1 ครั้ง) = ช้ากว่า includes ~12 เท่า
 *  - คำค้นถูกตีเป็น regex → พิมพ์ "(" แล้วค้นไม่เจออะไรเลย / "." match ทุกแถว
 *  - ตัดผลที่ 20 แถวแรก "ก่อน" เราจัดอันดับ → พิมพ์ "กรุงเทพ" ได้ 20 จาก 169 เขต/แขวง (ที่เหลือหาไม่เจอ)
 *  - zipcode ใช้ "มีอยู่ข้างใน" → พิมพ์ "10" ได้ 81100 มาปน
 */
import type { ThaiAddress } from "thai-address-database";

/** ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ ที่ลูกค้าเลือก */
export interface ThaiGeo {
  subdistrict: string;   // ตำบล/แขวง
  district: string;      // อำเภอ/เขต
  province: string;      // จังหวัด
  zipcode: string;
}

export interface AddressRow extends ThaiGeo {
  /** field ที่ใช้ค้นแบบข้อความ — เรียงตามความสำคัญ (ตำบลตรงสุดก่อน) */
  fields: [string, string, string];
}

/** แปลงข้อมูลดิบ → index (ตัดแถวซ้ำ — DB ต้นทางมีซ้ำ 2 แถว) */
export function buildAddressIndex(raw: ThaiAddress[]): AddressRow[] {
  const seen = new Set<string>();
  const out: AddressRow[] = [];
  for (const r of raw) {
    const zipcode = String(r.zipcode);
    const key = `${r.district}|${r.amphoe}|${r.province}|${zipcode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ subdistrict: r.district, district: r.amphoe, province: r.province, zipcode, fields: [r.district, r.amphoe, r.province] });
  }
  return out;
}

/** อันดับของ 1 คำ: 0 = ขึ้นต้นด้วยคำค้น, 1 = มีอยู่ข้างใน, -1 = ไม่ match */
function tokenRank(fields: AddressRow["fields"], zip: string, token: string): number {
  if (/^\d+$/.test(token)) return zip.startsWith(token) ? (zip === token ? 0 : 1) : -1;
  let best = -1;
  for (const f of fields) {
    if (f.startsWith(token)) return 0;
    if (best < 0 && f.includes(token)) best = 1;
  }
  return best;
}

/**
 * ค้นที่อยู่ — รองรับหลายคำคั่นเว้นวรรค (เช่น "บางรัก กรุงเทพ" หรือ "บางรัก 10500") ทุกคำต้อง match
 * ตัวเลขล้วน = รหัสไปรษณีย์ (prefix) · อื่น ๆ = ตำบล/อำเภอ/จังหวัด
 * จัดอันดับด้วย bucket (O(n) ไม่ต้อง sort ทั้งก้อน) — "ขึ้นต้นด้วย" มาก่อน "มีอยู่ข้างใน"
 */
export function searchAddress(index: AddressRow[], query: string, limit = 50): ThaiGeo[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || query.trim().length < 2) return [];

  const maxRank = tokens.length;   // ผลรวมอันดับต่อคำ: 0..tokens.length
  const buckets: AddressRow[][] = Array.from({ length: maxRank + 1 }, () => []);
  for (const row of index) {
    let total = 0;
    for (const t of tokens) {
      const r = tokenRank(row.fields, row.zipcode, t);
      if (r < 0) { total = -1; break; }
      total += r;
    }
    if (total >= 0) buckets[total].push(row);
  }

  const out: ThaiGeo[] = [];
  for (const b of buckets) {
    for (const r of b) {
      out.push({ subdistrict: r.subdistrict, district: r.district, province: r.province, zipcode: r.zipcode });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
