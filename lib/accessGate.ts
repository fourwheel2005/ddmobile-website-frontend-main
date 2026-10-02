/**
 * กำแพงสมาชิก — ใครเข้าหน้าไหนได้ (pure function: ใช้ใน proxy.ts และทดสอบตรง ๆ ได้)
 *
 * กติกา (ตกลงกับร้าน):
 *  - เปิดสาธารณะ: หน้าแรก + หน้าแนะนำบริการ (ฟอร์มในหน้ายังต้องล็อกอิน) + ล็อกอิน/นโยบาย/ติดต่อ
 *    + ลิงก์ระบบ /r (ดูรูปเครื่องจากแชท LINE) และ /d (QR ติดเครื่องหน้าร้าน → พาไปหน้าเครื่อง)
 *  - หน้าอื่นทั้งหมด = สมาชิกเท่านั้น (allowlist: หน้าที่เพิ่มใหม่ถูกล็อกโดยอัตโนมัติ ไม่หลุดเพราะลืมตั้ง)
 *  - สมาชิกที่ข้อมูลยังไม่ครบ (ชื่อ/เบอร์/ที่อยู่) → พาไปเติมที่หน้าโปรไฟล์ก่อน แล้วกลับหน้าเดิม
 *
 * ⚠️ นี่คือด่าน UX (กันคนทั่วไป) ตัดสินจาก cookie dd_session ที่หน้าเว็บตั้งเอง — ข้อมูลที่ต้องปลอดภัยจริง
 *    (คำสั่งซื้อ/โปรไฟล์/คำขอบริการ) backend ตรวจ JWT ทุกครั้งอยู่แล้ว
 */
export const SESSION_COOKIE = "dd_session";
/** c = สมาชิกข้อมูลครบ (หรือพนักงาน) · i = ล็อกอินแล้วแต่ข้อมูลไม่ครบ */
export type SessionState = "c" | "i";

export const PUBLIC_PATHS = new Set(["/", "/login", "/privacy", "/contact", "/sell", "/trade-in", "/services", "/installments"]);
export const PUBLIC_PREFIXES = ["/r/", "/d/"];
export const COMPLETE_PROFILE_PATH = "/profile";

export type GateDecision = { type: "allow" } | { type: "redirect"; location: string };

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

/**
 * สวิตช์ฉุกเฉิน: NEXT_PUBLIC_MEMBERS_WALL=off → ปิดกำแพง (ดูสินค้าได้อิสระเหมือนก่อนมีกำแพง)
 * การทำรายการ (ชำระเงิน/ส่งคำขอบริการ) ยังต้องเป็นสมาชิกตามเดิม เพราะ backend บังคับเอง
 * ดูขั้นตอน rollback เต็มที่ docs/rollback/members-wall.md
 */
export const membersWallEnabled = (flag: string | undefined) => flag !== "off";

export function gate(pathname: string, search: string, session: string | undefined, wallEnabled = true): GateDecision {
  if (!wallEnabled || isPublicPath(pathname)) return { type: "allow" };
  const back = encodeURIComponent(pathname + (search || ""));
  if (session !== "c" && session !== "i") return { type: "redirect", location: `/login?redirect=${back}` };
  if (session === "i" && pathname !== COMPLETE_PROFILE_PATH) {
    return { type: "redirect", location: `${COMPLETE_PROFILE_PATH}?complete=1&redirect=${back}` };
  }
  return { type: "allow" };
}

/** ปลายทางหลังล็อกอิน/เติมข้อมูล: เฉพาะ path ภายในเว็บ (กัน open-redirect ไป "//evil.com" หรือ "/\evil") */
export function safeRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!/^\/(?!\/|\\)/.test(raw)) return null;
  return raw;
}
