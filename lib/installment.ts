// ตารางผ่อน (overlay DD) — helper จับคู่ catalog → ผ่อนเริ่มต้น ใช้ร่วมหน้า list ทั้งหมด
export interface InstallmentPlan {
  productId: string;
  storage: string;
  downPayment: number | null;
  terms: { months: number; monthly: number; down?: number | null }[];
  note: string | null;
}
export interface InstallmentSerial {
  serialId: string;
  downPayment: number | null;
  months: number | null;
  monthly: number | null;
  terms?: { months: number; monthly: number; down?: number | null }[] | null;
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
/** งวดที่ถือว่า "สมเหตุสมผล" — กันข้อมูลกรอกสลับช่อง (เช่น months=1790, monthly=12) โผล่เป็นราคาผ่อน */
const saneMonths = (m: number | null | undefined): boolean => typeof m === "number" && m >= 1 && m <= 60;
const saneMonthly = (v: number | null | undefined): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;
/** ค่างวดต่อเดือนต่ำสุดจาก terms ที่ผ่านการกรอง (null = ไม่มีงวดที่ใช้ได้) */
export function minValidMonthly(terms: { months: number; monthly: number }[] | null | undefined): number | null {
  const valid = (terms ?? []).filter((t) => saneMonths(t.months) && saneMonthly(t.monthly)).map((t) => t.monthly);
  return valid.length ? Math.min(...valid) : null;
}
/** งวดที่ค่างวดต่ำสุด (ผ่านการกรอง) — ใช้หาดาวน์ของงวดนั้น (down รายงวดถ้ามี) */
export function cheapestValidTerm<T extends { months: number; monthly: number }>(terms: T[] | null | undefined): T | null {
  let best: T | null = null;
  for (const t of terms ?? []) {
    if (!saneMonths(t.months) || !saneMonthly(t.monthly)) continue;
    if (best == null || t.monthly < best.monthly) best = t;
  }
  return best;
}

export function buildInstLookup(plans: InstallmentPlan[], serials: InstallmentSerial[]) {
  const planMap = new Map<string, InstallmentPlan>();
  plans.forEach((p) => planMap.set(`${p.productId}|${p.storage || ""}`, p));
  const serialMap = new Map<string, InstallmentSerial>();
  serials.forEach((s) => serialMap.set(s.serialId, s));

  return (it: CatalogLike): InstInfo | null => {
    if (it.type === "UNIT") {
      const s = serialMap.get(it.id);
      if (!s) return null;
      // flat monthly ใช้ได้เฉพาะเมื่อ months สมเหตุสมผล (กันข้อมูลสลับช่อง)
      const flat = saneMonths(s.months) && saneMonthly(s.monthly) ? s.monthly : null;
      const cheapest = cheapestValidTerm(s.terms);
      return { down: cheapest?.down ?? s.downPayment, monthly: cheapest?.monthly ?? flat, note: s.note };
    }
    if (it.type === "MODEL") {
      let best: InstInfo | null = null;
      const storages = new Set((it.options ?? []).map((o) => o?.storage || ""));
      storages.forEach((st) => {
        const p = planMap.get(`${it.id}|${st}`);
        if (!p) return;
        const cheapest = cheapestValidTerm(p.terms);
        const minMonthly = cheapest?.monthly ?? null;
        if (cheapest != null && minMonthly != null && (best == null || best.monthly == null || minMonthly < best.monthly))
          best = { down: cheapest.down ?? p.downPayment, monthly: minMonthly, note: p.note };
      });
      return best;
    }
    return null;
  };
}
