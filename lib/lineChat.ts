/**
 * เปิด "ห้องแชทของลูกค้าคนนั้น" ใน LINE OA Manager (chat.line.biz) — ที่แอดมินเห็นข้อความทั้งหมดและตอบได้
 *
 * ⚠️ ห้ามใช้ lineChatUrl()/LINE_URL (line.me/R/oaMessage) กับแอดมิน — นั่นคือลิงก์ฝั่งลูกค้า:
 *    เปิดแล้วเป็นแชทระหว่าง "LINE ส่วนตัวของแอดมิน" กับร้าน จึงไม่เห็นข้อความลูกค้าเลย
 */
import api from "@/lib/api";

export const OA_CHAT_HOME = "https://chat.line.biz/";

export interface LineStatus {
  configured: boolean; adminGroup: boolean;
  chatMode: "chat" | "bot" | null; basicId: string | null; chatUrlBase: string | null;
}

const USER_ID = /^U[0-9a-f]{32}$/;

/** ลิงก์ห้องแชทลูกค้า · ไม่รู้บอท/ยังไม่ผูก LINE = หน้ารวมแชท (ค้นชื่อเอา) */
export function oaChatUrl(status: LineStatus | null, lineUserId: string | null | undefined): string {
  if (!status?.chatUrlBase || !lineUserId || !USER_ID.test(lineUserId)) return OA_CHAT_HOME;
  return status.chatUrlBase + lineUserId;
}

let cached: Promise<LineStatus | null> | null = null;

/** สถานะ LINE (ดึงครั้งเดียวต่อการเปิดหลังบ้าน) — ล้ม = null (ปุ่มยังพาไปหน้ารวมแชทได้) */
export function loadLineStatus(): Promise<LineStatus | null> {
  cached ??= api.get<LineStatus>("/admin/line/status").then((r) => r.data).catch(() => {
    cached = null;
    return null;
  });
  return cached;
}
