/**
 * ลืมรหัสผ่าน — กติกาฝั่งหน้าเว็บ (ตรงกับ backend PasswordResetService)
 *
 * ลิงก์ในอีเมล: /reset-password#token=… — ใช้ fragment (#) เพราะเบราว์เซอร์ไม่ส่งไปเซิร์ฟเวอร์และไม่ติดไปกับ Referer
 * token จึงไม่หลุดเข้า log ของ Vercel/nginx หรือเว็บปลายทางที่ลูกค้ากดต่อ
 */
export const MIN_PASSWORD_LENGTH = 8;
/** BCrypt ใช้แค่ 72 ไบต์แรก — backend ไม่รับยาวกว่านี้ */
export const MAX_PASSWORD_BYTES = 72;

/** ดึง token จาก location.hash (#token=…) · รูปแบบผิด = null */
export function tokenFromHash(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const t = params.get("token");
  return t && /^[A-Za-z0-9_-]{40,64}$/.test(t) ? t : null;
}

/** ตรวจรหัสใหม่ก่อนส่ง — คืนข้อความผิดพลาด (ไทย) หรือ null ถ้าผ่าน */
export function passwordProblem(password: string, confirm: string): string | null {
  if (!password.trim()) return "กรุณากรอกรหัสผ่านใหม่";
  if ([...password].length < MIN_PASSWORD_LENGTH) return `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return "รหัสผ่านยาวเกินไป";
  if (password !== confirm) return "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
  return null;
}

export type ResetLinkStatus = "VALID" | "INVALID" | "EXPIRED" | "USED";

/** ข้อความอธิบายลิงก์ที่ใช้ไม่ได้ */
export const LINK_PROBLEM: Record<Exclude<ResetLinkStatus, "VALID">, string> = {
  EXPIRED: "ลิงก์นี้หมดอายุแล้ว (ใช้ได้ภายใน 30 นาที)",
  USED: "ลิงก์นี้ถูกใช้ไปแล้ว",
  INVALID: "ลิงก์ไม่ถูกต้องหรือไม่ครบ",
};

/**
 * ข้อความทัก LINE เมื่อเข้าอีเมลไม่ได้ — backend `WebChatMessage` แยกเรื่องนี้จาก "สวัสดี…ลืมรหัสผ่าน"
 * แล้วส่งการ์ด "ช่วยเหลือบัญชี" เข้ากลุ่มแอดมิน (แก้ข้อความต้องคงสองคำนี้ไว้)
 */
export const ACCOUNT_HELP_MESSAGE = "สวัสดีครับ/ค่ะ ลืมรหัสผ่านเข้าเว็บ และเข้าอีเมลที่สมัครไม่ได้ ขอให้แอดมินช่วยหน่อย";
