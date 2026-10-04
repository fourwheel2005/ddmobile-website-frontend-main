/**
 * การซื้อ — ร้านปิดการขายในแชท LINE (ปิดตะกร้า/ซื้อเลย/ชำระเงินบนเว็บ)
 *
 * NEXT_PUBLIC_WEB_CHECKOUT=on → เปิดตะกร้า/ชำระเงินบนเว็บกลับ (ต้องเปิด WEB_CHECKOUT_ENABLED ฝั่ง backend คู่กัน)
 * ไม่ตั้ง/ค่าอื่น → ปุ่มซื้อทุกจุดกลายเป็น "ทัก LINE" พร้อมรายละเอียดเครื่อง (ดู docs/rollback/web-checkout.md)
 *
 * ออเดอร์ที่สั่งผ่านเว็บไปแล้ว (รอแนบสลิป/จัดส่ง/รีวิว) ใช้งานได้ตามเดิม — สวิตช์นี้ปิดแค่ "การสั่งใหม่"
 */
import type { CartItem } from "@/context/CartContext";
import { baht } from "@/lib/money";

export const WEB_CHECKOUT = process.env.NEXT_PUBLIC_WEB_CHECKOUT === "on";

export interface Coupon { code: string; percent: number; expiresAt: string | null; }
export interface Buyer { name?: string; tel?: string; }

/** โค้ดที่ลดมากสุด (ยังไม่หมดอายุ) — แนบไปในข้อความ LINE ให้แอดมินใช้ให้ (เดิมลูกค้าเห็นคูปองได้ที่หน้า checkout หน้าเดียว) */
export function bestCoupon(list: Coupon[], now = Date.now()): Coupon | null {
  const usable = list.filter((c) => c.percent > 0 && (!c.expiresAt || new Date(c.expiresAt).getTime() > now));
  return usable.reduce<Coupon | null>((a, b) => (!a || b.percent > a.percent ? b : a), null);
}

export type BuyStatus = "available" | "out" | "sold" | "ask-price";

export interface BuyInterest {
  status: BuyStatus;
  productName: string;
  color?: string | null;
  storage?: string | null;
  conditionLabel?: string | null;
  code?: string | null;          // IMEI (มือสองรายเครื่อง) หรือ SKU
  price: number | null;          // ราคาปกติที่หน้าเว็บโชว์
  promo?: { name: string; label: string; priceAfter: number } | null;   // Flash Sale ที่หน้าเว็บโชว์อยู่
  coupon?: Coupon | null;
  url?: string | null;           // ลิงก์หน้าเครื่อง (แอดมินเปิดดูรุ่น/สีที่ลูกค้าเลือกได้ตรง ๆ)
  buyer?: Buyer | null;
}

const HEADER: Record<BuyStatus, string> = {
  available: "🛒 สนใจซื้อเครื่องนี้ (ซื้อสด)",
  out: "📦 สนใจเครื่องนี้ — ขอสอบถาม/สั่งจอง (หน้าเว็บแจ้งสินค้าหมด)",
  sold: "🔎 สนใจรุ่นนี้ — เครื่องที่ดูขายแล้ว ขอดูเครื่องอื่นที่ใกล้เคียง",
  "ask-price": "💬 สอบถามราคาเครื่องนี้",
};

/** ข้อความที่พิมพ์รอในแชท LINE — ข้อมูลครบให้แอดมินปิดการขายได้โดยไม่ต้องถามซ้ำ */
export function buildBuyMessage(b: BuyInterest): string {
  const spec = [b.color, b.storage, b.conditionLabel].filter(Boolean).join(" · ");
  const lines: (string | null)[] = [
    HEADER[b.status],
    `รุ่น: ${b.productName}`,
    spec ? `สเปก: ${spec}` : null,
    b.code ? `รหัส: ${b.code}` : null,
    b.price != null && b.status !== "ask-price" ? `ราคา: ${baht(b.price)}` : null,
    b.promo && b.status === "available" ? `⚡ ${b.promo.name} (${b.promo.label}) เหลือ ${baht(b.promo.priceAfter)}` : null,
    b.coupon && b.status === "available" ? `🎟 โค้ดส่วนลดของฉัน: ${b.coupon.code} (ลด ${b.coupon.percent}%)` : null,
    b.url ? `ดูเครื่อง: ${b.url}` : null,
    ...buyerLines(b.buyer),
  ];
  return lines.filter((l): l is string => !!l).join("\n");
}

/** ตะกร้าที่ลูกค้าเก็บไว้ก่อนปิดการสั่งบนเว็บ → ส่งทั้งรายการเข้า LINE ทีเดียว (ไม่ให้ของในตะกร้าสูญเปล่า) */
export function buildCartMessage(items: CartItem[], buyer?: Buyer | null, coupon?: Coupon | null): string {
  const total = items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  const lines: (string | null)[] = [
    `🛒 สนใจซื้อ ${items.length} รายการ (จากตะกร้าบนเว็บ)`,
    ...items.map((i, k) => {
      const spec = [i.color, i.storage, i.conditionLabel].filter(Boolean).join(" · ");
      return `${k + 1}. ${i.productName}${spec ? ` (${spec})` : ""} x${i.quantity} — ${baht(i.unitPrice * i.quantity)}${i.sku ? ` [${i.sku}]` : ""}`;
    }),
    `รวมโดยประมาณ: ${baht(total)} (แอดมินยืนยันราคา/สต็อกจริงอีกครั้ง)`,
    coupon ? `🎟 โค้ดส่วนลดของฉัน: ${coupon.code} (ลด ${coupon.percent}%)` : null,
    ...buyerLines(buyer),
  ];
  return lines.filter((l): l is string => !!l).join("\n");
}

function buyerLines(buyer?: Buyer | null): string[] {
  if (!buyer) return [];
  const out = [buyer.name?.trim() ? `ชื่อ: ${buyer.name.trim()}` : null, buyer.tel?.trim() ? `เบอร์: ${buyer.tel.trim()}` : null]
    .filter((l): l is string => !!l);
  return out.length ? ["", ...out] : [];
}

/** สถานะปุ่มซื้อของเครื่อง (ชุดเดียวกับเงื่อนไขปุ่มเดิม: ขายแล้ว / หมด / ไม่มีราคา / พร้อมขาย) */
export function buyStatus(sold: boolean, quantity: number, price: number | null): BuyStatus {
  if (sold) return "sold";
  if (price == null) return "ask-price";
  if (quantity <= 0) return "out";
  return "available";
}

/** สถิติ "บริการที่ลูกค้าสนใจ" (หลังบ้าน) — มือ 1 / มือ 2 ตามสภาพเครื่อง */
export const intentForCondition = (condition: string | null | undefined) => (condition === "NEW" ? "NEW" : "USED");
