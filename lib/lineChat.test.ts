import { describe, expect, it } from "vitest";
import { OA_CHAT_HOME, oaChatUrl, parseChatAccountId, type LineStatus } from "./lineChat";

const acct = "U66712b7e0981735dee668de4a2036f10";
const status: LineStatus = {
  configured: true, adminGroup: true, chatMode: "chat", basicId: "@770judgg",
  chatUrlBase: `https://chat.line.biz/${acct}/chat/`, chatAccountId: acct, chatAccountSource: "ADMIN",
};
const cust = `U${"a".repeat(32)}`;

describe("oaChatUrl — ลิงก์ห้องแชทลูกค้าใน LINE OA Manager", () => {
  it("ตั้งบัญชีแล้ว + ลูกค้าผูก LINE แล้ว → ห้องแชทของลูกค้าคนนั้น", () => {
    expect(oaChatUrl(status, cust)).toBe(`https://chat.line.biz/${acct}/chat/${cust}`);
  });
  it("ยังไม่ผูก / userId ผิดรูป → หน้ารวมแชทของบัญชีร้าน (ไม่หลุดไปบัญชีอื่น)", () => {
    expect(oaChatUrl(status, null)).toBe(OA_CHAT_HOME + acct);
    expect(oaChatUrl(status, "Ucust")).toBe(OA_CHAT_HOME + acct);
    expect(oaChatUrl(status, `${cust}/../x`)).toBe(OA_CHAT_HOME + acct);
  });
  it("ยังไม่ตั้งบัญชี / โหลดสถานะไม่ได้ → หน้าแรก chat.line.biz (ไม่ใช่ลิงก์ฝั่งลูกค้า line.me)", () => {
    expect(oaChatUrl({ ...status, chatUrlBase: null, chatAccountId: null }, cust)).toBe(OA_CHAT_HOME);
    expect(oaChatUrl(null, cust)).toBe(OA_CHAT_HOME);
    expect(oaChatUrl(null, cust)).not.toContain("line.me");
  });
});

describe("parseChatAccountId — วางลิงก์จากแถบที่อยู่ chat.line.biz", () => {
  it("รับลิงก์ห้องแชท/หน้าบัญชี และ ID ตรง ๆ", () => {
    expect(parseChatAccountId(`https://chat.line.biz/${acct}/chat/U6fb03c327ac69d667a0a98536f3430a5`)).toBe(acct);
    expect(parseChatAccountId(`  chat.line.biz/${acct}  `)).toBe(acct);
    expect(parseChatAccountId(acct)).toBe(acct);
  });
  it("ปฏิเสธรูปแบบอื่น (ตรงกับ backend)", () => {
    for (const bad of ["", "U123", acct.toUpperCase(), `http://chat.line.biz/${acct}`, `https://evil.example/chat.line.biz/${acct}`,
      `https://chat.line.biz.evil.example/${acct}`, `https://chat.line.biz/${acct}x`, "https://manager.line.biz/account/@770judgg"]) {
      expect(parseChatAccountId(bad), bad).toBeNull();
    }
  });
});
