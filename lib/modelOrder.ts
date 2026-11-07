/**
 * ลำดับ "รุ่น" มือถือ ต่ำ → สูง — ใช้ทั้ง sort "รุ่นต่ำ → สูง" และ dropdown ตัวกรองรุ่น
 *
 * เรียงชื่อตรง ๆ (A-Z) ผิด: "iPhone 16e" ไปอยู่หลัง "16 Pro Max", "iPhone X" ไปอยู่หลัง "iPhone 17"
 * จึงแปลงชื่อเป็น key = [ตระกูล, ซีรีส์, รุ่น(ปี), ระดับในรุ่น]
 *   - iPhone: SE/16e < mini < ธรรมดา < Plus < Air < Pro < Pro Max
 *     X/XR/XS อยู่ระหว่าง 8 กับ 11 · 6s = 6.5 · SE แต่ละรุ่นอยู่ต้นรุ่นปีที่ออก (SE2 = รุ่น 11, SE3 = รุ่น 13)
 *   - ยี่ห้ออื่น: อยู่หลัง iPhone แยกตามยี่ห้อ → ซีรีส์ (A/S/Note/Z…) → เลขรุ่น → ระดับ (FE/Lite < ธรรมดา < Plus < Pro < Ultra)
 * ชื่อที่ไม่มีเลขรุ่น → ท้ายซีรีส์ แล้วเรียงชื่อแบบตัวเลข (natural) เป็นตัวตัดสินสุดท้าย
 */

export interface ModelKey {
  family: string;   // "0" = iPhone (ขึ้นก่อนเสมอ) · "1<ยี่ห้อ>" = ยี่ห้ออื่น
  series: string;
  gen: number;
  tier: number;
}

const NO_GEN = Number.MAX_SAFE_INTEGER;

// ระดับในรุ่นเดียวกัน (ต่ำ → สูง)
const T_LOW = 0, T_MINI = 1, T_BASE = 2, T_PLUS = 3, T_AIR = 4, T_PRO = 5, T_PRO_PLUS = 5.5, T_TOP = 6;

const clean = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/[()]/g, " ").replace(/\s+/g, " ").trim();

function iphoneTier(tail: string): number {
  const t = tail.replace(/\s+/g, "");
  if (t.includes("pro") && t.includes("max")) return T_TOP;
  if (t.includes("pro")) return T_PRO;
  if (t.includes("air")) return T_AIR;
  if (t.includes("plus") || t.startsWith("+")) return T_PLUS;
  if (t.includes("mini")) return T_MINI;
  return T_BASE;
}

function iphoneKey(rest: string): ModelKey {
  const k = (gen: number, tier: number): ModelKey => ({ family: "0", series: "", gen, tier });

  if (/^se\b/.test(rest)) {
    if (/3rd|third|2022|\b3\b/.test(rest)) return k(13, T_LOW);
    if (/2nd|second|2020|\b2\b/.test(rest)) return k(11, T_LOW);
    return k(6.5, T_LOW);
  }
  if (/^xr\b/.test(rest)) return k(10.5, T_BASE);
  if (/^xs\b/.test(rest)) return k(10.5, rest.includes("max") ? T_TOP : T_PRO);
  if (/^x\b/.test(rest)) return k(10, T_PRO);
  if (/^air\b/.test(rest)) return k(17, T_AIR);

  const m = rest.match(/^(\d+)(.*)$/);
  if (!m) return k(NO_GEN, T_BASE);
  let gen = Number(m[1]);
  let tail = m[2];
  // ตัวอักษรติดเลขรุ่น: 6s/7s → ครึ่งรุ่น · 16e/5c → รุ่นเล็กสุดของปีนั้น (แต่ "15pro" ไม่ใช่ suffix)
  const suffix = tail.match(/^([sce])(?![a-z])/)?.[1];
  if (suffix) tail = tail.slice(1);
  if (suffix === "s") gen += 0.5;
  return k(gen, suffix === "e" || suffix === "c" ? T_LOW : iphoneTier(tail));
}

function genericTier(tail: string): number {
  const t = tail.replace(/\s+/g, "");
  if (t.includes("ultra") || (t.includes("pro") && t.includes("max"))) return T_TOP;
  if (t.includes("pro+") || t.includes("proplus")) return T_PRO_PLUS;
  if (t.includes("pro")) return T_PRO;
  if (t.includes("plus") || t.startsWith("+")) return T_PLUS;
  if (/^(fe|lite|mini|neo|e)\b/.test(tail.trim()) || t === "fe" || t === "lite") return T_MINI;
  return T_BASE;
}

/** แปลงชื่อรุ่น (+ ยี่ห้อ ถ้ามี) เป็น key สำหรับเรียงลำดับ */
export function modelKey(productName: string, brand?: string | null): ModelKey {
  const b = clean(brand);
  let s = clean(productName);
  if (s.startsWith("apple ")) s = s.slice(6);

  const iphone = s.match(/^iphone\s*(.*)$/);
  if (iphone) return iphoneKey(iphone[1].trim());

  if (b && s.startsWith(b + " ")) s = s.slice(b.length + 1);
  s = s.replace(/^galaxy\s+/, "");
  const family = "1" + (b || s.split(" ")[0] || "");
  const m = s.match(/^([a-z][a-z ]*?)?\s*(\d+)(.*)$/);
  if (!m) return { family, series: s, gen: NO_GEN, tier: T_BASE };
  return { family, series: (m[1] ?? "").trim(), gen: Number(m[2]), tier: genericTier(m[3]) };
}

const natural = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });

/**
 * เทียบรุ่น 2 ชื่อ: dir = 1 ต่ำ → สูง · -1 สูง → ต่ำ
 * ตระกูลไม่กลับด้านตาม dir (iPhone ขึ้นก่อนยี่ห้ออื่นเสมอ) — กลับเฉพาะลำดับภายในตระกูล
 */
export function compareModelNames(
  a: { productName: string; brand?: string | null },
  b: { productName: string; brand?: string | null },
  dir: 1 | -1 = 1,
): number {
  const ka = modelKey(a.productName, a.brand), kb = modelKey(b.productName, b.brand);
  if (ka.family !== kb.family) return ka.family < kb.family ? -1 : 1;
  const d = natural(ka.series, kb.series) || ka.gen - kb.gen || ka.tier - kb.tier || natural(a.productName, b.productName);
  return dir * d;
}
