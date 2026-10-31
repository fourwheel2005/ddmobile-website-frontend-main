/**
 * รีวิวร้าน — ชนิดข้อมูล + ป้ายช่องทาง/จุดเด่น + ลิงก์ขอรีวิว (/review/{token})
 * รหัสช่องทาง/จุดเด่นต้องตรงกับ backend `model/ReviewChannels.java`
 */

export const REVIEW_API = (process.env.NEXT_PUBLIC_API_URL || "https://ddmobilewebsite.fourwheel.in.th/api/v1").replace(/\/+$/, "");

export interface PublicReview {
  id: number; displayName: string; rating: number; comment: string | null;
  productName: string | null; variantLabel: string | null; images: string[];
  helpfulCount: number; votedByMe: boolean; adminReply: string | null;
  adminReplyAt: string | null; createdAt: string | null;
  channel?: string | null; tags?: string[] | null;
}

export interface StoreReviews {
  average: number; count: number; histogram: Record<number, number>;
  channels: Record<string, number>; withImages: number;
  reviews: PublicReview[]; hasMore: boolean;
}

export type InviteStatus = "PENDING" | "OPENED" | "USED" | "EXPIRED" | "REVOKED";

/** สิ่งที่ลูกค้าเห็นเมื่อเปิดลิงก์ขอรีวิว */
export interface InviteView {
  status: InviteStatus; firstName: string | null; productName: string | null;
  channel: string | null; expiresAt: string | null; review: PublicReview | null;
}

/** แถวลิงก์ขอรีวิวในหลังบ้าน */
export interface InviteRow {
  id: number; url: string; customerName: string; productName: string | null; channel: string; note: string | null;
  status: InviteStatus; createdBy: string; createdAt: string; expiresAt: string;
  openedAt: string | null; usedAt: string | null; reviewId: number | null; rating: number | null;
}

/** ช่องทางที่ร้านออกลิงก์ขอรีวิวได้ (เรียงตามที่ร้านขายบ่อย) */
export const INVITE_CHANNELS = [
  { code: "STORE", label: "หน้าร้าน" },
  { code: "FACEBOOK", label: "Facebook" },
  { code: "LINE", label: "LINE" },
  { code: "TIKTOK", label: "TikTok" },
  { code: "INSTAGRAM", label: "Instagram" },
  { code: "OTHER", label: "ช่องทางอื่น" },
] as const;

export function channelLabel(code: string | null | undefined): string {
  if (!code || code === "WEBSITE") return "เว็บไซต์";
  return INVITE_CHANNELS.find((c) => c.code === code)?.label ?? "ช่องทางอื่น";
}

/** ป้ายยืนยันใต้ชื่อผู้รีวิว — บอกตรง ๆ ว่ายืนยันด้วยวิธีไหน */
export function verifiedLabel(code: string | null | undefined): string {
  if (!code || code === "WEBSITE") return "ซื้อผ่านเว็บไซต์ · รับสินค้าแล้ว";
  if (code === "STORE") return "ซื้อที่หน้าร้าน · ร้านยืนยันการซื้อ";
  return `ซื้อผ่าน ${channelLabel(code)} · ร้านยืนยันการซื้อ`;
}

export const REVIEW_TAGS = [
  { code: "SERVICE", label: "บริการดี" },
  { code: "FAST_REPLY", label: "แอดมินตอบไว" },
  { code: "AS_DESCRIBED", label: "เครื่องตรงปก" },
  { code: "GOOD_PRICE", label: "ราคาคุ้มค่า" },
  { code: "EASY_INSTALLMENT", label: "ผ่อนง่าย" },
  { code: "FAST_SHIPPING", label: "ส่งไว" },
  { code: "TRUSTWORTHY", label: "ร้านน่าเชื่อถือ" },
  { code: "RECOMMEND", label: "แนะนำต่อแน่นอน" },
] as const;

export const tagLabel = (code: string): string | null => REVIEW_TAGS.find((t) => t.code === code)?.label ?? null;

/** คำใต้ดาว (ตรงกับ backend `LineCards.ratingWord`) */
export const STAR_WORDS: Record<number, string> = {
  1: "ไม่พอใจ", 2: "ควรปรับปรุง", 3: "พอใช้", 4: "ดีมาก", 5: "ประทับใจมาก",
};

/**
 * ชื่อที่แสดงบนรีวิวสาธารณะ — ต้องตรงกับ backend `ReviewService.maskName`
 * "สมชาย ใจดี" → "คุณสมช***" · "คุณแอน" → "คุณแอน***"
 */
export function maskReviewName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "ลูกค้า DD Mobile";
  let first = trimmed.split(/\s+/)[0];
  if (first.startsWith("คุณ") && first.length > 3) first = first.slice(3);
  return `คุณ${first.length <= 3 ? first : first.slice(0, 3)}***`;
}

const TOKEN_RE = /^[2-9A-HJ-NP-Za-km-z]{12}$/;
export const isReviewToken = (t: string) => TOKEN_RE.test(t);

export type InviteResult = { kind: "ok"; invite: InviteView } | { kind: "missing" };

/** ข้อมูลลิงก์ขอรีวิว (server component) — สถานะเปลี่ยนได้ตลอด จึงไม่ cache */
export async function loadInvite(token: string): Promise<InviteResult> {
  if (!isReviewToken(token)) return { kind: "missing" };
  try {
    const res = await fetch(`${REVIEW_API}/review-invites/${token}`, { cache: "no-store" });
    if (!res.ok) return { kind: "missing" };
    return { kind: "ok", invite: (await res.json()) as InviteView };
  } catch {
    return { kind: "missing" };
  }
}

/** ข้อความชวนรีวิวที่แอดมินคัดลอกไปส่งในแชท (สุภาพ สั้น บอกว่าใช้เวลาไม่นาน) */
export function inviteMessage(customerName: string, productName: string | null, url: string): string {
  const first = customerName.trim().split(/\s+/)[0]?.replace(/^คุณ(?=.)/, "") || "ลูกค้า";
  const what = productName ? ` ${productName} ` : "สินค้า";
  return [
    `สวัสดีครับคุณ${first} 😊`,
    `ขอบคุณที่ไว้วางใจซื้อ${what}กับ DD Mobile นะครับ`,
    `รบกวนสละเวลาสักนิด ให้คะแนนและรีวิวร้านหน่อยได้ไหมครับ ⭐ (ใช้เวลาไม่ถึง 1 นาที ไม่ต้องสมัครสมาชิก)`,
    url,
    `รีวิวของคุณช่วยให้ลูกค้าคนอื่นมั่นใจ และช่วยให้ร้านพัฒนาบริการได้ดียิ่งขึ้นครับ 🙏`,
  ].join("\n");
}

/** แชร์ข้อความเข้า LINE (เลือกแชทลูกค้าได้เลย) */
export const lineShareUrl = (text: string) => `https://line.me/R/share?text=${encodeURIComponent(text)}`;

export const reviewDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "";
