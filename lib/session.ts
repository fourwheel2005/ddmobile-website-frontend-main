/**
 * สถานะสมาชิกฝั่งหน้าเว็บ — token/user อยู่ใน localStorage (เดิม) + cookie dd_session ให้ proxy อ่านได้ตั้งแต่ฝั่งเซิร์ฟเวอร์
 * (cookie ล็อกอินจริงเป็นของโดเมน backend หน้าเว็บมองไม่เห็น จึงต้องมีตัวบอกสถานะบนโดเมนนี้เอง)
 * ทุกจุดที่เปลี่ยนสถานะล็อกอิน/ข้อมูลสมาชิก ต้องผ่านไฟล์นี้ — cookie กับ localStorage จะได้ไม่เพี้ยนกัน
 */
import { SESSION_COOKIE, type SessionState } from "@/lib/accessGate";
import type { StoredUser } from "@/lib/profile";

const TEL_RE = /^0\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}$/;
const STAFF_ROLES = ["ROLE_ADMIN", "ROLE_EMPLOYEE"];
const MAX_AGE = 14 * 24 * 60 * 60;   // = อายุ refresh token (หมดแล้วต้องล็อกอินใหม่อยู่ดี)

/** สมาชิกข้อมูลครบ = ชื่อ + เบอร์ถูกรูปแบบ + ที่อยู่ครบ (บ้านเลขที่ + ตำบล/อำเภอ/จังหวัด/zip) · พนักงานได้รับยกเว้น */
export function isProfileComplete(u: StoredUser | null | undefined): boolean {
  if (!u) return false;
  if (u.role && STAFF_ROLES.includes(u.role)) return true;
  const a = u.address;
  return !!(
    u.name?.trim() && u.tel && TEL_RE.test(u.tel.trim())
    && a && a.addressLine?.trim() && a.subdistrict?.trim() && a.district?.trim() && a.province?.trim()
    && /^\d{5}$/.test(a.zipcode ?? "")
  );
}

export const sessionState = (u: StoredUser): SessionState => (isProfileComplete(u) ? "c" : "i");

export function sessionCookie(value: SessionState | null, secure: boolean): string {
  const base = `${SESSION_COOKIE}=${value ?? ""}; Path=/; SameSite=Lax; Max-Age=${value ? MAX_AGE : 0}`;
  return secure ? `${base}; Secure` : base;
}

/** ตั้ง/ลบ cookie ตาม user (null = ออกจากระบบ) */
export function writeSessionCookie(u: StoredUser | null) {
  if (typeof document === "undefined") return;
  document.cookie = sessionCookie(u ? sessionState(u) : null, location.protocol === "https:");
}

/** ซิงก์ cookie จาก localStorage — ผู้ที่ล็อกอินค้างไว้ก่อนมีกำแพงจะได้ไม่ต้องล็อกอินใหม่ */
export function syncSessionCookie() {
  try {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    writeSessionCookie(token && raw ? (JSON.parse(raw) as StoredUser) : null);
  } catch {
    writeSessionCookie(null);
  }
}

/** ออกจากระบบ/เซสชันหมดอายุ — ล้างทุกอย่างที่บอกสถานะล็อกอินในที่เดียว */
export function clearSession() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch { /* storage ถูกบล็อก */ }
  writeSessionCookie(null);
}
