import type { ImageLoaderProps } from "next/image";

/**
 * โหลดรูปสินค้าจาก BFF โดยตรง (ข้าม Next image optimizer)
 *
 * เดิม <Image> ส่ง URL รูปเต็มเข้า /_next/image ให้ Next ไปดึงจาก BFF มา re-encode เองอีกชั้น
 * = ทำงานซ้ำ 2 รอบ และ optimizer cache miss (รูปมือสองรายเครื่องไม่ซ้ำกัน) ทำให้รูปมาช้า
 *
 * loader นี้ให้เบราว์เซอร์ยิงตรงไป BFF `/api/v1/stock-image/{id}?w=<ค่าที่รองรับ>` ซึ่ง BFF
 * ย่อ+แคช+อุ่นไว้ให้แล้ว (PERF-08) — เหลือ resize/แคชแค่ชั้นเดียว และได้รูปที่ pre-warm ไว้
 */

// ต้องตรงกับ StockImageController.ALLOWED_WIDTHS ฝั่ง BFF (จะ reject ค่าอื่น)
const ALLOWED_WIDTHS = [200, 400, 800, 1200] as const;

export function stockImageLoader({ src, width }: ImageLoaderProps): string {
  const base = src.split("?")[0];
  // เฉพาะรูปที่ proxy มาจาก Stock เท่านั้น — อย่างอื่น (โลโก้/รูป local) คืนเดิมไว้ให้ optimizer จัดการ
  if (!/\/api\/v1\/stock-image\/[^/?#]+$/.test(base)) return src;
  const w = ALLOWED_WIDTHS.find((a) => a >= width) ?? ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
  return `${base}?w=${w}`;
}

/** พื้นเทาอ่อน (8x8 PNG) ใช้เป็น blur placeholder ระหว่างรูปโหลด — กันการ์ดว่างเปล่า */
export const IMAGE_BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAE0lEQVR4XmN49/ErVsSAKTSYJQC3IrUBXMYmKAAAAABJRU5ErkJggg==";
