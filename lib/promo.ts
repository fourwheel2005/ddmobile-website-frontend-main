/** โปรราคาจาก Stock (FIX-217) — server ส่งราคาโปรมาแล้ว (minPrice/price) + ราคาเดิม/ชื่อโปร/เวลาจบ
 *  หน้าเว็บแค่จัดรูปแสดง: ป้าย "โปรพิเศษ" + ราคาเดิมขีดฆ่า + นับถอยหลัง · หมดโปร server ส่งราคาปกติกลับมาเอง
 *  (โปรระดับสินค้า/หมวดของเว็บเลิกใช้แล้ว — เว็บเหลือเฉพาะคูปอง/ลดทั้งบิล) */
export interface ItemPromo {
  name: string;
  label: string;               // ข้อความบนป้าย
  priceBefore: number | null;  // ราคาเดิม (ขีดฆ่า) — null = โปรไม่ได้ลดราคาสด (ลดดาวน์/ผ่อนอย่างเดียว)
  priceAfter: number;          // ราคาที่ขายตอนนี้
  endAt: string | null;        // ISO UTC
}

export const PROMO_BADGE = "โปรพิเศษ";

export function stockPromo(
  price: number | null | undefined,
  originalPrice: number | null | undefined,
  promoName: string | null | undefined,
  promoEndsAt: string | null | undefined,
): ItemPromo | null {
  if (!promoName || price == null || price <= 0) return null;
  const cut = originalPrice != null ? originalPrice - price : 0;
  return {
    name: promoName,
    label: cut > 0 ? `${PROMO_BADGE} -฿${cut.toLocaleString()}` : PROMO_BADGE,
    priceBefore: cut > 0 ? originalPrice! : null,
    priceAfter: price,
    endAt: promoEndsAt ?? null,
  };
}
