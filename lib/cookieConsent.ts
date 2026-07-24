/**
 * Cookie Consent — logic ล้วน (ไม่พึ่ง React/DOM ยกเว้น I/O ที่ localStorage)
 * เก็บความยินยอมฝั่ง client ตามแนวทาง PDPA/GDPR:
 *   • "จำเป็น" (necessary) เปิดเสมอ ปิดไม่ได้ — auth cookie / ตะกร้า / session
 *   • "วิเคราะห์" (analytics) และ "การตลาด" (marketing) ต้องได้รับความยินยอมก่อน
 * ค่าที่บันทึกมี version + วันหมดอายุ → เปลี่ยนนโยบายหรือครบกำหนดแล้วถามใหม่
 *
 * ฟังก์ชัน parse/validate เป็น pure (ทดสอบได้) · read/write ห่อ localStorage แยกไว้
 */

export type OptionalCategory = "analytics" | "marketing";

export interface ConsentChoices {
  analytics: boolean;
  marketing: boolean;
}

/** รูปแบบที่เก็บลง localStorage (ย่อ key เพื่อไม่ให้พอง) */
export interface StoredConsent extends ConsentChoices {
  v: number;      // schema version
  at: number;     // epoch ms ที่ให้ความยินยอม
}

export const CONSENT_KEY = "dd_cookie_consent_v1";
export const CONSENT_VERSION = 1;
export const MAX_AGE_DAYS = 180;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/** event ที่ยิงเมื่อความยินยอมเปลี่ยน — ให้ตัวโหลด script (เช่น analytics ในอนาคต) subscribe ได้ */
export const CONSENT_EVENT = "dd:cookie-consent";

/** ยอมรับทุกหมวด */
export const ACCEPT_ALL: ConsentChoices = { analytics: true, marketing: true };
/** ปฏิเสธหมวดที่เลือกได้ (เหลือเฉพาะ "จำเป็น") */
export const REJECT_ALL: ConsentChoices = { analytics: false, marketing: false };

/**
 * ตรวจ raw จาก storage ว่าใช้ได้ไหม — คืน StoredConsent ถ้าถูกต้องและยังไม่หมดอายุ, ไม่งั้น null
 * (null = ยังไม่ตัดสินใจ/นโยบายเปลี่ยน/หมดอายุ → ต้องแสดงแบนเนอร์ใหม่)
 */
export function parseConsent(raw: string | null, now: number): StoredConsent | null {
  if (!raw) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null) return null;
  const c = obj as Record<string, unknown>;
  if (c.v !== CONSENT_VERSION) return null;               // นโยบายคนละเวอร์ชัน → ถามใหม่
  if (typeof c.at !== "number" || !Number.isFinite(c.at)) return null;
  if (now - c.at > MAX_AGE_MS) return null;                // หมดอายุ → ถามใหม่
  if (typeof c.analytics !== "boolean" || typeof c.marketing !== "boolean") return null;
  return { v: CONSENT_VERSION, at: c.at, analytics: c.analytics, marketing: c.marketing };
}

/** สร้าง record พร้อมบันทึก จาก choices + เวลาปัจจุบัน */
export function buildConsent(choices: ConsentChoices, now: number): StoredConsent {
  return { v: CONSENT_VERSION, at: now, analytics: choices.analytics, marketing: choices.marketing };
}

/** อ่านความยินยอมจาก localStorage — null ถ้ายังไม่ตัดสินใจ/หมดอายุ/storage ถูกบล็อก */
export function readConsent(now: number = Date.now()): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_KEY), now);
  } catch {
    return null;   // โหมดส่วนตัว/บล็อก storage → ถือว่ายังไม่ตัดสินใจ
  }
}

/** บันทึกความยินยอม + ยิง event ให้ผู้ฟัง (fire-and-forget, ล้มก็ไม่กระทบ UX) */
export function writeConsent(choices: ConsentChoices, now: number = Date.now()): StoredConsent {
  const record = buildConsent(choices, now);
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  } catch {
    /* บล็อก storage → เก็บไม่ได้ ใช้ค่าใน session ต่อไป (จะถามใหม่รอบหน้า) */
  }
  try {
    window.dispatchEvent(new CustomEvent<StoredConsent>(CONSENT_EVENT, { detail: record }));
  } catch {
    /* SSR/สภาพแวดล้อมไม่มี CustomEvent → ข้าม */
  }
  return record;
}
