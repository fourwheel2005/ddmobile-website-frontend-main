/** โปรอัตโนมัติที่ active (จาก GET /promotions/active) — ใช้โชว์ป้าย flash sale/ราคาขีดฆ่า
 *  แสดงผลเท่านั้น: ส่วนลดจริงคิดใหม่ที่ server ตอนสร้างออเดอร์เสมอ */
export interface PublicPromotion {
  id: number;
  name: string;
  discountType: "PERCENT" | "AMOUNT";
  value: number;
  scope: "ORDER" | "PRODUCT" | "CATEGORY";
  scopeRef: string | null;
  minSubtotal: number | null;
  endAt: string | null;
}

export interface ItemPromo { name: string; label: string; priceAfter: number; endAt: string | null; }

interface ItemLike { id: string; variantId?: string | null; category?: string | null; }

/** หาโปรระดับสินค้า/หมวดที่ลดมากสุดของ item หนึ่งตัว (ORDER scope ไม่โชว์บนการ์ด) */
export function promoForItem(promos: PublicPromotion[], it: ItemLike, price: number | null): ItemPromo | null {
  if (price == null || price <= 0) return null;
  let best: ItemPromo | null = null;
  for (const p of promos) {
    let hit = false;
    if (p.scope === "PRODUCT" && p.scopeRef) {
      const refs = p.scopeRef.split(",").map((s) => s.trim());
      hit = refs.includes(it.id) || (!!it.variantId && refs.includes(it.variantId));
    } else if (p.scope === "CATEGORY" && p.scopeRef && it.category) {
      hit = it.category.trim().toLowerCase() === p.scopeRef.trim().toLowerCase();
    }
    if (!hit) continue;
    const cut = p.discountType === "PERCENT" ? Math.round((price * p.value) / 100) : Math.min(p.value, price);
    if (cut <= 0) continue;
    const after = price - cut;
    if (!best || after < best.priceAfter) {
      best = {
        name: p.name,
        label: p.discountType === "PERCENT" ? `-${p.value}%` : `-฿${p.value.toLocaleString()}`,
        priceAfter: after,
        endAt: p.endAt,
      };
    }
  }
  return best;
}
