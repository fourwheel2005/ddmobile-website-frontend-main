import { describe, it, expect } from "vitest";
import { LINE_URL, lineChatUrl } from "./contact";

/** ข้อความที่ LINE จะใส่ในช่องแชท = ทุกอย่างหลัง "?" (decode แล้ว) */
const prefill = (url: string) => decodeURIComponent(url.slice(url.indexOf("?") + 1));

describe("lineChatUrl", () => {
  it("ไม่มีข้อความ → ลิงก์แชทเปล่า", () => {
    expect(lineChatUrl()).toBe(LINE_URL);
  });
  it("ข้อความครบทุกตัวอักษร (ไทย/อีโมจิ/& ?) + ปิดท้ายด้วยขึ้นบรรทัดใหม่", () => {
    const msg = "📋 ขอใช้บริการ: ผ่อนเครื่อง\nที่อยู่: A&B ?=# 27000";
    expect(prefill(lineChatUrl(msg))).toBe(msg + "\n");
  });
  it("เบราว์เซอร์ในแอป Facebook แปะ &fbclid=… ท้ายลิงก์ → ไปอยู่บรรทัดใหม่ ไม่ต่อติดรหัสไปรษณีย์", () => {
    const msg = "ชื่อ: รุ่งนภา\nที่อยู่: ต.สระขวัญ อ.เมืองสระแก้ว จ.สระแก้ว 27000";
    const lines = prefill(lineChatUrl(msg) + "&fbclid=IwT01FWAVdJ0xleHRuA2Fl").split("\n");
    expect(lines).toContain("ที่อยู่: ต.สระขวัญ อ.เมืองสระแก้ว จ.สระแก้ว 27000");
    expect(lines.at(-1)).toBe("&fbclid=IwT01FWAVdJ0xleHRuA2Fl");
  });
  it("ข้อความที่มีช่องว่าง/ขึ้นบรรทัดท้ายอยู่แล้ว → ไม่ซ้อนบรรทัดว่าง", () => {
    expect(prefill(lineChatUrl("สวัสดี\n\n  "))).toBe("สวัสดี\n");
  });
});
