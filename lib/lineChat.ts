/**
 * เปิด "ห้องแชทของลูกค้าคนนั้น" ใน LINE OA Manager (chat.line.biz) — ที่แอดมินเห็นข้อความทั้งหมดและตอบได้
 *
 * ลิงก์ = chat.line.biz/{ID บัญชี OA}/chat/{LINE userId ลูกค้า}
 * ⚠️ ID บัญชี OA ของ chat.line.biz ≠ userId บอทจาก Messaging API — LINE ไม่มี API ให้ดึง ต้องตั้งเอง:
 *    แอดมินวางลิงก์ห้องแชทใดก็ได้ของร้าน (คัดลอกจากแถบที่อยู่ของ chat.line.biz) ที่แถบ LINE ในหลังบ้าน
 *
 * ⚠️ ห้ามใช้ lineChatUrl()/LINE_URL (line.me/R/oaMessage) กับแอดมิน — นั่นคือลิงก์ฝั่งลูกค้า:
 *    เปิดแล้วเป็นแชทระหว่าง "LINE ส่วนตัวของแอดมิน" กับร้าน จึงไม่เห็นข้อความลูกค้าเลย
 */
import api from "@/lib/api";

export const OA_CHAT_HOME = "https://chat.line.biz/";

export interface LineStatus {
  configured: boolean; adminGroup: boolean;
  chatMode: "chat" | "bot" | null; basicId: string | null;
  /** `https://chat.line.biz/{บัญชี}/chat/` · null = ยังไม่ตั้ง ID บัญชี OA */
  chatUrlBase: string | null;
  chatAccountId?: string | null;
  /** ADMIN = ตั้งในหลังบ้าน · ENV = ค่าจากเซิร์ฟเวอร์ (LINE_OA_CHAT_ID) */
  chatAccountSource?: "ADMIN" | "ENV" | null;
}

const USER_ID = /^U[0-9a-f]{32}$/;
const CHAT_LINK = /^(?:https:\/\/)?chat\.line\.biz\/(U[0-9a-f]{32})(?:[/?#].*)?$/;

/** ID บัญชีจาก "U…" ตรง ๆ หรือลิงก์ chat.line.biz/U…/… (ตรงกับ backend LineOaChat.parseAccountId) */
export function parseChatAccountId(input: string): string | null {
  const s = input.trim();
  if (USER_ID.test(s)) return s;
  return CHAT_LINK.exec(s)?.[1] ?? null;
}

/** ลิงก์ห้องแชทลูกค้า · ยังไม่ผูก LINE = หน้ารวมแชทของบัญชีร้าน · ยังไม่ตั้งบัญชี = หน้าแรก chat.line.biz */
export function oaChatUrl(status: LineStatus | null, lineUserId: string | null | undefined): string {
  if (!status?.chatUrlBase) return OA_CHAT_HOME;
  if (lineUserId && USER_ID.test(lineUserId)) return status.chatUrlBase + lineUserId;
  return status.chatAccountId && USER_ID.test(status.chatAccountId) ? OA_CHAT_HOME + status.chatAccountId : OA_CHAT_HOME;
}

let cached: Promise<LineStatus | null> | null = null;
const listeners = new Set<(s: LineStatus | null) => void>();

/** สถานะ LINE (ดึงครั้งเดียวต่อการเปิดหลังบ้าน) — ล้ม = null (ปุ่มยังพาไปหน้าแชทได้) */
export function loadLineStatus(): Promise<LineStatus | null> {
  cached ??= api.get<LineStatus>("/admin/line/status").then((r) => r.data).catch(() => {
    cached = null;
    return null;
  });
  return cached;
}

/** ปุ่ม/แถบทุกตัวในหน้า อัปเดตพร้อมกันเมื่อแก้ ID บัญชี */
export function onLineStatus(fn: (s: LineStatus | null) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** บันทึก ID บัญชี OA (วางลิงก์แชทหรือ ID ได้ · ว่าง = ลบค่าในหลังบ้าน) → สถานะใหม่ให้ทุกปุ่ม */
export async function saveChatAccount(value: string): Promise<LineStatus> {
  const { data } = await api.put<LineStatus>("/admin/line/chat-account", { value });
  cached = Promise.resolve(data);
  listeners.forEach((fn) => fn(data));
  return data;
}
