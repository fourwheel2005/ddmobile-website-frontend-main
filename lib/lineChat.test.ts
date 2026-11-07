import { describe, expect, it } from "vitest";
import { OA_CHAT_HOME, oaChatUrl, type LineStatus } from "./lineChat";

const status: LineStatus = { configured: true, adminGroup: true, chatMode: "chat", basicId: "@770judgg", chatUrlBase: `https://chat.line.biz/U${"b".repeat(32)}/chat/` };
const cust = `U${"a".repeat(32)}`;

describe("oaChatUrl — ลิงก์ห้องแชทลูกค้าใน LINE OA Manager", () => {
  it("รู้บอท + ลูกค้าผูก LINE แล้ว → ห้องแชทของลูกค้าคนนั้น", () => {
    expect(oaChatUrl(status, cust)).toBe(`https://chat.line.biz/U${"b".repeat(32)}/chat/${cust}`);
  });
  it("ยังไม่ผูก / userId ผิดรูป / ไม่รู้บอท → หน้ารวมแชท (ไม่ใช่ลิงก์ฝั่งลูกค้า line.me)", () => {
    expect(oaChatUrl(status, null)).toBe(OA_CHAT_HOME);
    expect(oaChatUrl(status, "Ucust")).toBe(OA_CHAT_HOME);
    expect(oaChatUrl({ ...status, chatUrlBase: null }, cust)).toBe(OA_CHAT_HOME);
    expect(oaChatUrl(null, cust)).toBe(OA_CHAT_HOME);
    expect(oaChatUrl(null, cust)).not.toContain("line.me");
  });
});
