/** ช่องทางติดต่อร้าน — แหล่งเดียว (เดิม hardcode ซ้ำ ~7 ไฟล์) */

/** LINE OA ID ของร้าน (ปลายทางเดียวกับ https://lin.ee/rewiz9b) */
export const LINE_ID = "@770judgg";

/**
 * ลิงก์เข้าแชท LINE OA ตรง ๆ (deep link) — เปิดห้องแชทในแอปทันที ไม่ผ่านหน้าสแกน QR
 * แบบเดิม lin.ee เป็นหน้า add-friend ที่โชว์ QR ให้สแกนก่อน
 * หมายเหตุ: บนเดสก์ท็อปที่ "ไม่ได้ติดตั้งแอป LINE" LINE จะ fallback เป็นหน้า QR เอง — เลี่ยงไม่ได้จากฝั่งเว็บ
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
