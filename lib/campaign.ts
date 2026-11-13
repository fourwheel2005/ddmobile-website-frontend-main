/**
 * หน้า Landing สำหรับยิงแอด (/p/{slug}) — ชนิดข้อมูล + ตัวช่วยที่ทดสอบได้
 * โครงต้องตรงกับ backend `dto/CampaignDtos.java`
 */
import { LINE_URL, TEL_HREF, lineChatUrl } from "@/lib/contact";

export const CAMPAIGN_API = (process.env.NEXT_PUBLIC_API_URL || "https://ddmobilewebsite.fourwheel.in.th/api/v1").replace(/\/+$/, "");

export type LinkType = "LINE" | "PATH" | "URL" | "PHONE";
export type ButtonStyle = "PRIMARY" | "LINE" | "DARK" | "OUTLINE";
export type ServiceIcon = "PHONE" | "INSTALLMENT" | "TRADE_IN" | "SELL" | "CHAT" | "STORE" | "SHIELD" | "TAG";

export interface CampaignLink { type: LinkType; value: string | null }
export interface CampaignButton { label: string | null; sublabel: string | null; link: CampaignLink | null; style: ButtonStyle | null }
export interface Hero {
  eyebrow: string | null; headline: string | null; highlight: string | null; subheadline: string | null;
  mediaId: number | null; mediaLabel: string | null;
}
export interface Offer {
  label: string | null; priceBefore: string | null; price: string | null; priceSuffix: string | null;
  note: string | null; countdownEnd: string | null; countdownLabel: string | null;
}
export interface ImageItem { mediaId: number | null; quote: string | null; caption: string | null }
export interface Reviews { title: string | null; subtitle: string | null; items: ImageItem[]; initialCount: number | null; showStoreReviews: boolean }
export interface ServiceCard { title: string | null; description: string | null; icon: ServiceIcon | null; mediaId: number | null; link: CampaignLink | null }
export interface Services { title: string | null; items: ServiceCard[] }
export interface TextItem { title: string | null; text: string | null }
export interface TextList { title: string | null; items: TextItem[] }
export interface Gallery { title: string | null; items: ImageItem[] }
export interface Closing { headline: string | null; text: string | null }

export interface CampaignContent {
  announcement: string | null;
  hero: Hero | null;
  ctas: CampaignButton[];
  offer: Offer | null;
  services: Services | null;
  reviews: Reviews | null;
  benefits: TextList | null;
  gallery: Gallery | null;
  faq: TextList | null;
  closing: Closing | null;
}

export interface CampaignMedia {
  id: number; kind: "VIDEO" | "IMAGE"; url: string; posterUrl: string | null;
  width: number; height: number; durationMs: number | null; sizeBytes: number;
}

export interface PublicCampaign { slug: string; title: string; description: string | null; content: CampaignContent; media: CampaignMedia[] }

export interface AdminCampaign {
  id: number; slug: string; title: string; description: string | null; published: boolean; version: number;
  content: CampaignContent; media: CampaignMedia[]; updatedBy: string; updatedAt: string;
}

export interface CampaignSummary { id: number; slug: string; title: string; published: boolean; mediaCount: number; updatedBy: string; updatedAt: string }

/**
 * หน้า Landing ยิงแอด = หน้าเดี่ยว ไม่มีเมนูเว็บ (Navbar/เมนูล่าง/Footer เต็ม) — คนจากแอดเห็นแค่คลิป/รีวิว/ปุ่มที่ร้านเลือก
 * ไม่มีทางรั่วไปเดินหน้าอื่นจนลืมทัก · เข้าเว็บได้ผ่านปุ่ม/การ์ดบริการในหน้า
 */
export const isLandingPath = (pathname: string | null | undefined) => !!pathname && pathname.startsWith("/p/");

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_PATH_RE = /^\/(?!\/)[A-Za-z0-9\-._~/?=&%#+:,@!]*$/;

/** ชื่อไทย/เว้นวรรค → slug ที่ใช้ได้ (ตัวอย่างให้แอดมิน — ภาษาไทยตัดทิ้ง ต้องพิมพ์อังกฤษเอง) */
export function toSlug(input: string): string {
  return input.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** ลิงก์ที่ลูกค้าแชร์/แปะในแอด */
export function publicPath(slug: string): string {
  return `/p/${slug}`;
}

export interface ResolvedLink { href: string; external: boolean }

/**
 * ปลายทางของปุ่ม → href
 * LINE: แนบข้อความที่พิมพ์รอไว้ + ชื่อหน้า (แอดมินรู้ว่าลูกค้ามาจากแอดตัวไหน)
 * ค่าที่ backend ตรวจแล้ว แต่กันซ้ำที่นี่อีกชั้น — ลิงก์แปลก = ไม่มีปลายทาง (ปุ่มไม่แสดง)
 */
export function resolveLink(link: CampaignLink | null | undefined, pageTitle?: string): ResolvedLink | null {
  if (!link) return null;
  const value = link.value?.trim() || "";
  switch (link.type) {
    case "LINE": {
      const parts = [value, pageTitle ? `(จากหน้า: ${pageTitle})` : ""].filter(Boolean);
      return { href: parts.length ? lineChatUrl(parts.join("\n")) : LINE_URL, external: true };
    }
    case "PHONE": {
      const digits = value.replace(/[^0-9+]/g, "");
      return { href: digits ? `tel:${digits}` : TEL_HREF, external: false };
    }
    case "PATH":
      // ตรงกับ regex ฝั่ง backend — กัน "//x" และ "/\\x" (เบราว์เซอร์ตีความเป็นโดเมนอื่น)
      return SAFE_PATH_RE.test(value) ? { href: value, external: false } : null;
    case "URL":
      return /^https:\/\/[^/\s]+/i.test(value) ? { href: value, external: true } : null;
    default:
      return null;
  }
}

export function mediaById(media: CampaignMedia[]): Map<number, CampaignMedia> {
  return new Map(media.map((m) => [m.id, m]));
}

/** เวลาที่เหลือ (ms → วัน/ชม./นาที/วินาที) · หมดเวลาแล้ว/ไม่มีวันที่ = null (ซ่อนตัวนับ ไม่โชว์ 00:00 หลอก) */
export function countdownParts(endIso: string | null | undefined, now: number): { d: number; h: number; m: number; s: number } | null {
  if (!endIso) return null;
  const end = Date.parse(endIso);
  if (Number.isNaN(end)) return null;
  const left = Math.floor((end - now) / 1000);
  if (left <= 0) return null;
  return { d: Math.floor(left / 86400), h: Math.floor((left % 86400) / 3600), m: Math.floor((left % 3600) / 60), s: left % 60 };
}

/** <input type="datetime-local"> (เวลาไทย) ↔ ISO ที่เก็บใน backend */
export function localInputToIso(local: string): string | null {
  if (!local) return null;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ? `${local}:00+07:00` : null;
}

export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const bkk = new Date(t + 7 * 3600_000);
  return bkk.toISOString().slice(0, 16);
}

/** section ไหนมีของให้แสดง (ว่าง = ไม่แสดงบนหน้าเว็บ) — ใช้ทั้งหน้าลูกค้าและป้าย "ว่าง" ในหลังบ้าน */
export function hasOffer(o: Offer | null | undefined): boolean {
  return !!o && !!(o.price || o.note);
}

/** แคชฝั่งเซิร์ฟเวอร์ของ Next ต่อหน้า (วินาที) — แอดมินแก้แล้วลูกค้าเห็นภายในเวลานี้ */
export const CAMPAIGN_REVALIDATE_SECONDS = 30;

/**
 * โหลดหน้า (ฝั่งเซิร์ฟเวอร์ของ Next)
 * null = ไม่มีหน้านี้/ยังไม่เผยแพร่ (404 จริง) · backend ล่ม/รีสตาร์ต = throw → error.tsx ให้กดลองใหม่
 * (ไม่ตอบ 404 ตอนล่ม — กันการ์ดลิงก์ใน Facebook แคชเป็น "ไม่พบหน้า")
 *
 * แคช 30 วิ: ทุกคำขอจาก Next ไป backend มาจาก IP เครื่อง Next เดียว → RateLimitFilter นับรวมกันทั้งเว็บ (browse 300/นาที)
 * แอดยิงคนเข้าพร้อมกันหลายร้อยคน/นาที ถ้าไม่แคชจะโดน 429 ทั้งหมด · แคชแล้ว = ~2 คำขอ/นาที/หน้า ไม่ว่าคนเข้าเท่าไร
 * และตอน backend ล่มชั่วคราว Next ยังเสิร์ฟฉบับเดิมที่แคชไว้ได้
 */
export async function loadPublicCampaign(rawSlug: string): Promise<PublicCampaign | null> {
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug).toLowerCase();   // ลิงก์ที่พิมพ์ตัวใหญ่ในแคปชัน (/p/iPhone16) ยังเปิดได้
  } catch {
    return null;   // %ผิดรูป = ไม่มีหน้านี้ (ไม่ใช่ error)
  }
  if (!SLUG_RE.test(slug)) return null;
  const res = await fetch(`${CAMPAIGN_API}/campaign-pages/${encodeURIComponent(slug)}`, {
    next: { revalidate: CAMPAIGN_REVALIDATE_SECONDS },
    headers: { "ngrok-skip-browser-warning": "true" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`campaign page ${slug}: HTTP ${res.status}`);
  return (await res.json()) as PublicCampaign;
}

/** หน้าว่างตามโครง (ใช้ตอนเนื้อหาจาก server ขาด field) */
export function withDefaults(c: Partial<CampaignContent> | null | undefined): CampaignContent {
  return {
    announcement: c?.announcement ?? null,
    hero: c?.hero ?? null,
    ctas: c?.ctas ?? [],
    offer: c?.offer ?? null,
    services: c?.services ? { ...c.services, items: c.services.items ?? [] } : null,
    reviews: c?.reviews ? { ...c.reviews, items: c.reviews.items ?? [] } : null,
    benefits: c?.benefits ? { ...c.benefits, items: c.benefits.items ?? [] } : null,
    gallery: c?.gallery ? { ...c.gallery, items: c.gallery.items ?? [] } : null,
    faq: c?.faq ? { ...c.faq, items: c.faq.items ?? [] } : null,
    closing: c?.closing ?? null,
  };
}
