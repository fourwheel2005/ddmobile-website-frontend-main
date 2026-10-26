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

interface CatalogLike { id: string; type: string; options?: ({ storage: string | null; quantity?: number | null } | null)[] | null; }

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

/* ============================ ลูกค้าเพิ่มเงินดาวน์เอง ============================ */

/** ดาวน์ได้สูงสุด = 50% ของราคาเครื่อง (มากกว่านี้ซื้อสดคุ้มกว่า) */
export const MAX_DOWN_RATIO = 0.5;

/** เพิ่มดาวน์ได้น้อยกว่านี้ = ไม่โชว์ปุ่ม (เพดานชิดดาวน์ของแผน เช่น ดาวน์ 16,900 · เพดาน 16,950) */
export const MIN_DOWN_ROOM = 500;

/**
 * ช่วงดาวน์ที่ลูกค้าเลือกได้ — ต่ำสุด = ดาวน์ของแผน · สูงสุด = 50% ของราคา (ปัดลงหลักสิบ)
 * null = เพิ่มดาวน์ไม่ได้ (ไม่มีราคา/ดาวน์ · ดาวน์ของแผนชิด/เกินเพดานอยู่แล้ว · ยอดจัดไม่เหลือ)
 */
export function downRange(price: number | null | undefined, baseDown: number | null | undefined): { min: number; max: number } | null {
  if (price == null || baseDown == null || !Number.isFinite(price) || !Number.isFinite(baseDown)) return null;
  if (price <= 0 || baseDown < 0 || baseDown >= price) return null;
  const max = Math.floor((price * MAX_DOWN_RATIO) / 10) * 10;
  return max - baseDown >= MIN_DOWN_ROOM ? { min: baseDown, max } : null;
}

/** ดาวน์ที่ใช้จริง: ไม่ระบุ = ดาวน์ของแผน · บีบให้อยู่ในช่วงเสมอ (ปัดเป็นบาทเต็ม) */
export function effectiveDown(desired: number | null | undefined, range: { min: number; max: number } | null, baseDown: number): number {
  if (!range || desired == null || !Number.isFinite(desired)) return baseDown;
  return Math.min(range.max, Math.max(range.min, Math.round(desired)));
}

/** ปุ่ม − / + : ขยับทีละ 500 แล้ว "เข้าเลขกลม" (3,990 → 4,500 → 5,000) · บีบในช่วงเสมอ */
export function stepDown(down: number, dir: 1 | -1, range: { min: number; max: number }): number {
  const STEP = 500;
  const next = dir > 0 ? Math.ceil((down + STEP / 2) / STEP) * STEP : Math.floor((down - STEP / 2) / STEP) * STEP;
  return Math.min(range.max, Math.max(range.min, next));
}

/**
 * ยอดดาวน์ลัด (ปุ่มเลือกเร็ว) — ดาวน์ปกติ · 2 ค่ากลมระหว่างทาง · สูงสุด
 * ช่วงแคบจนค่ากลางซ้ำ/ชนขอบ → ตัดทิ้ง (เหลือ 2–4 ปุ่ม จัดกริดเท่ากันได้เสมอ)
 */
export function quickDowns(range: { min: number; max: number }): number[] {
  const span = range.max - range.min;
  const unit = span >= 6000 ? 1000 : 500;
  const mids = [1, 2].map((k) => Math.round((range.min + (span * k) / 3) / unit) * unit);
  // ค่ากลางต้องห่างขอบอย่างน้อยครึ่งหน่วย (กันปุ่ม 4,990 กับ 5,000 ติดกัน)
  const gap = unit / 2;
  return Array.from(new Set([range.min, ...mids.filter((v) => v >= range.min + gap && v <= range.max - gap), range.max]));
}

/**
 * ค่างวดใหม่เมื่อดาวน์เพิ่ม — **ดอกเท่าเดิม ห้ามลด**: เงินที่ดาวน์เพิ่มไปหักออกจากค่างวด เฉลี่ยเท่ากันทุกงวด
 *
 *   ค่างวดใหม่ = ค่างวดเดิม − (ดาวน์ที่เพิ่ม ÷ จำนวนงวด)   → ปัดขึ้นเป็นบาทเต็ม
 *
 * ยอดผ่อนจบ (ดาวน์ + ค่างวด × งวด) จึง "ไม่น้อยกว่าเดิม" เสมอ — หารลงตัว = เท่าเดิมเป๊ะ ·
 * หารไม่ลงตัว = เกินเดิมไม่ถึงงวดละ 1 บาท (ปัดขึ้น ไม่ปัดลง เพื่อไม่ให้ดอกหายแม้แต่บาทเดียว)
 * ดาวน์เท่าเดิม/น้อยกว่า = ค่างวดเดิมเป๊ะ · คิดด้วยจำนวนเต็ม (ไม่มี floating point เพี้ยน)
 */
export function monthlyForDown(monthly: number, months: number, baseDown: number, down: number): number {
  const extra = Math.round(down) - Math.round(baseDown);
  if (!(extra > 0) || !(months >= 1) || !Number.isFinite(monthly)) return monthly;
  const next = Number.isInteger(monthly)
    ? monthly - Math.floor(extra / months)          // = ceil(monthly − extra/months) แบบจำนวนเต็มล้วน
    : Math.ceil(monthly - extra / months);
  return Math.max(1, Math.min(monthly, next));
}

/** ยอดผ่อนจบทั้งสัญญา = ดาวน์ + ค่างวด × จำนวนงวด */
export const contractTotal = (down: number, monthly: number, months: number) => down + monthly * months;

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
      // ผ่อนเริ่มของการ์ด = เฉพาะความจุที่ยังมีของ (FIX-204) · ไม่มีข้อมูลจำนวน (ข้อมูลเก่า) = ถือว่ามีของ
      const storages = new Set((it.options ?? [])
        .filter((o) => !!o && (o.quantity == null || o.quantity > 0))
        .map((o) => o?.storage || ""));
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
