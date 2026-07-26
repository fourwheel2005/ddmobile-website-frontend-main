/** ช่องทางติดต่อร้าน — แหล่งเดียว (เดิม hardcode ซ้ำ ~7 ไฟล์) */

/**
 * LINE OA ID ของร้าน
 * ลิงก์ย่อทั้งสองอันชี้ OA เดียวกันนี้ (ตรวจแล้วด้วย HTTP 301):
 *   https://lin.ee/xzwMleE → https://line.me/R/ti/p/@770judgg
 *   https://lin.ee/rewiz9b → https://line.me/R/ti/p/@770judgg
 */
export const LINE_ID = "@770judgg";

/**
 * ลิงก์ย่อ add-friend — ใช้ตอนต้องแปะ/แชร์ลิงก์ให้คนกดเพิ่มเพื่อน
 * ข้อจำกัด: lin.ee เด้งไปหน้า `ti/p/` ซึ่ง "พาข้อความติดไปด้วยไม่ได้" → เวลาต้องส่งรายละเอียดให้ใช้ lineChatUrl()
 */
export const LINE_ADD_FRIEND_URL = "https://lin.ee/xzwMleE";

/**
 * ลิงก์เข้าแชท LINE OA ตรง ๆ (deep link) — เปิดห้องแชทในแอปทันที ไม่ผ่านหน้าสแกน QR
 * เป็นรูปแบบเดียวที่พาข้อความ (prefill) ไปลงช่องแชทได้ จึงใช้อันนี้กับฟอร์มที่ต้องส่งรายละเอียด
 * หมายเหตุ: บนเดสก์ท็อปที่ "ไม่ได้ติดตั้งแอป LINE" LINE จะ fallback เป็นหน้า QR และข้อความจะหาย
 *          → ฝั่งเรียกใช้ต้องมีทางสำรองให้คัดลอกข้อความเสมอ
 */
export const LINE_URL = `https://line.me/R/oaMessage/${encodeURIComponent(LINE_ID)}/`;

/** ลิงก์เข้าแชท LINE OA พร้อมข้อความที่พิมพ์รอไว้ในช่องแชทให้เลย */
export const lineChatUrl = (message?: string) =>
  message ? `${LINE_URL}?${encodeURIComponent(message)}` : LINE_URL;

export const TEL = "088-818-8385";
export const TEL_HREF = "tel:0888188385";
export const FACEBOOK_URL = "https://www.facebook.com/iphoneeasyinstallment";
export const TIKTOK_URL = "https://www.tiktok.com/@ddmobile_";
export const INSTAGRAM_URL = "https://www.instagram.com/ddmobileplus/";
