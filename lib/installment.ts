// ตารางผ่อน (overlay DD) — helper จับคู่ catalog → ผ่อนเริ่มต้น ใช้ร่วมหน้า list ทั้งหมด
export interface InstallmentPlan {
  productId: string;
  storage: string;
  downPayment: number | null;
  terms: { months: number; monthly: number }[];
  note: string | null;
}
export interface InstallmentSerial {
  serialId: string;
  downPayment: number | null;
  months: number | null;
  monthly: number | null;
  note: string | null;
}
export interface InstInfo { down: number | null; monthly: number | null; note: string | null; }

interface CatalogLike { id: string; type: string; options?: ({ storage: string | null } | null)[] | null; }

/**
 * สร้างฟังก์ชัน lookup ผ่อน "เริ่มต้น" ของแต่ละสินค้า:
 *  - MODEL (มือ1) → จับคู่ productId+ความจุ, เลือกค่างวดต่ำสุดในรุ่น
 *  - UNIT (มือ2)  → จับคู่ serialId
 * คืน null ถ้ายังไม่ตั้งตารางผ่อน
 */
export function buildInstLookup(plans: InstallmentPlan[], serials: InstallmentSerial[]) {
  const planMap = new Map<string, InstallmentPlan>();
  plans.forEach((p) => planMap.set(`${p.productId}|${p.storage || ""}`, p));
  const serialMap = new Map<string, InstallmentSerial>();
  serials.forEach((s) => serialMap.set(s.serialId, s));

  return (it: CatalogLike): InstInfo | null => {
    if (it.type === "UNIT") {
      const s = serialMap.get(it.id);
      return s ? { down: s.downPayment, monthly: s.monthly, note: s.note } : null;
    }
    if (it.type === "MODEL") {
      let best: InstInfo | null = null;
      const storages = new Set((it.options ?? []).map((o) => o?.storage || ""));
      storages.forEach((st) => {
        const p = planMap.get(`${it.id}|${st}`);
        if (!p) return;
        const minMonthly = (p.terms ?? []).reduce<number | null>(
          (mn, t) => (mn == null ? t.monthly : Math.min(mn, t.monthly)), null);
        if (minMonthly != null && (best == null || best.monthly == null || minMonthly < best.monthly))
          best = { down: p.downPayment, monthly: minMonthly, note: p.note };
      });
      return best;
    }
    return null;
  };
}
