import { describe, expect, it } from "vitest";
import {
  channelLabel, inviteMessage, isReviewToken, lineShareUrl, maskReviewName, tagLabel, verifiedLabel,
} from "./reviews";

describe("maskReviewName — ต้องตรงกับ backend ReviewService.maskName", () => {
  it("3 ตัวแรกของชื่อแรก + *** · ไม่ซ้อน คุณคุณ", () => {
    expect(maskReviewName("สมชาย ใจดี")).toBe("คุณสมช***");
    expect(maskReviewName("คุณแอน")).toBe("คุณแอน***");
    expect(maskReviewName("คุณ")).toBe("คุณคุณ***");
    expect(maskReviewName("  Annie  B")).toBe("คุณAnn***");
    expect(maskReviewName("  ")).toBe("ลูกค้า DD Mobile");
  });
});

describe("token ลิงก์ขอรีวิว — ตรงกับ backend ReviewInviteService.TOKEN", () => {
  it("12 ตัว ไม่มี 0 O 1 I l", () => {
    expect(isReviewToken("Ab3dEf6hJk7m")).toBe(true);
    expect(isReviewToken("Ab3dEf6hJk7")).toBe(false);
    expect(isReviewToken("Ab3dEf6hJk7m1")).toBe(false);
    for (const bad of ["0", "O", "1", "I", "l"]) expect(isReviewToken(`Ab3dEf6hJk7${bad}`)).toBe(false);
    expect(isReviewToken("../../etc/pa")).toBe(false);
  });
});

describe("ป้ายช่องทาง/จุดเด่น", () => {
  it("ช่องทาง + ป้ายยืนยันบอกวิธียืนยันตรง ๆ", () => {
    expect(channelLabel("WEBSITE")).toBe("เว็บไซต์");
    expect(channelLabel(null)).toBe("เว็บไซต์");
    expect(channelLabel("TIKTOK")).toBe("TikTok");
    expect(channelLabel("???")).toBe("ช่องทางอื่น");
    expect(verifiedLabel("WEBSITE")).toBe("ซื้อผ่านเว็บไซต์ · รับสินค้าแล้ว");
    expect(verifiedLabel("STORE")).toBe("ซื้อที่หน้าร้าน · ร้านยืนยันการซื้อ");
    expect(verifiedLabel("FACEBOOK")).toBe("ซื้อผ่าน Facebook · ร้านยืนยันการซื้อ");
  });
  it("จุดเด่นที่ไม่รู้จัก → null (ไม่แสดง)", () => {
    expect(tagLabel("SERVICE")).toBe("บริการดี");
    expect(tagLabel("HACK")).toBeNull();
  });
});

describe("ข้อความชวนรีวิว", () => {
  it("ทักชื่อแรก (ตัด คุณ ที่พิมพ์มา) + สินค้า + ลิงก์บรรทัดเดี่ยว", () => {
    const m = inviteMessage("คุณสมชาย ใจดี", "iPhone 15 Pro", "https://www.ddmobileshop.com/review/Ab3dEf6hJk7m");
    expect(m.split("\n")[0]).toBe("สวัสดีครับคุณสมชาย 😊");
    expect(m).toContain("ซื้อ iPhone 15 Pro กับ DD Mobile");
    expect(m.split("\n")).toContain("https://www.ddmobileshop.com/review/Ab3dEf6hJk7m");
  });
  it("ไม่มีสินค้า → \"ซื้อสินค้ากับ\" ไม่มีช่องว่างเกิน", () => {
    expect(inviteMessage("แอน", null, "u")).toContain("ขอบคุณที่ไว้วางใจซื้อสินค้ากับ DD Mobile");
    expect(inviteMessage("แอน", null, "u")).not.toContain("  ");
  });
  it("แชร์เข้า LINE เข้ารหัสข้อความ", () => {
    expect(lineShareUrl("a b\nค")).toBe("https://line.me/R/share?text=a%20b%0A%E0%B8%84");
  });
});
