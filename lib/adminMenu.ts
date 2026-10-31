/**
 * ลิงก์ตรงเข้าเมนูหลังบ้าน (/admin?menu=…) — ปุ่ม "เปิดในหลังบ้าน" บนการ์ด LINE ของแอดมินใช้ลิงก์นี้
 * slug ต้องตรงกับ backend `LineAdminChannel.adminUrl(...)`
 */
export const ADMIN_MENU_SLUGS: Record<string, string> = {
  installments: "คำขอผ่อนสินค้า",
  "trade-in": "คำขอขาย/บอลลูน",
};

/** ชื่อเมนูจาก query string (?menu=installments) · ไม่รู้จัก/ไม่มี = null (อยู่หน้าเดิม) */
export function menuFromSearch(search: string): string | null {
  const slug = new URLSearchParams(search).get("menu");
  return slug && Object.prototype.hasOwnProperty.call(ADMIN_MENU_SLUGS, slug) ? ADMIN_MENU_SLUGS[slug] : null;
}
