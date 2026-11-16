import { describe, expect, it } from "vitest";
import { abbreviateName, formatReviewDate, initialOf, isSocialLink, sectionSourceUrl, todayInBangkok, FACEBOOK_REVIEWS_URL, type SocialReview } from "./socialReviews";

describe("abbreviateName", () => {
  it("ย่อนามสกุลเหลืออักษรแรก (อังกฤษ/ไทย/ญี่ปุ่น)", () => {
    expect(abbreviateName("Paphawee Sorndech")).toBe("Paphawee S.");
    expect(abbreviateName("  Num  Num   Pornsawan ")).toBe("Num P.");
    expect(abbreviateName("ชายพเนจร ไปเลื่อย")).toBe("ชายพเนจร ป.");
    expect(abbreviateName("ส้มน้อย หวานหวาน")).toBe("ส้มน้อย ห.");
    expect(abbreviateName("ハハ ノンオムレツ")).toBe("ハハ ノ.");
    expect(abbreviateName("boonyawee ice")).toBe("boonyawee I.");
  });
  it("คำเดียว / ย่อแล้ว / ว่าง = คงเดิม", () => {
    expect(abbreviateName("Pang")).toBe("Pang");
    expect(abbreviateName("Pang P.")).toBe("Pang P.");
    expect(abbreviateName("   ")).toBe("");
  });
  it("initialOf ข้ามสระหน้าไทย", () => {
    expect(initialOf("แก้ว")).toBe("ก");
    expect(initialOf("ไปเลื่อย")).toBe("ป");
    expect(initialOf("")).toBe("");
  });
});

describe("formatReviewDate", () => {
  it("วันที่ไทย พ.ศ. ไม่เลื่อนวันตามเขตเวลา", () => {
    expect(formatReviewDate("2026-02-15")).toMatch(/^15 ก\.พ\. 2569$/);
    expect(formatReviewDate("2026-12-31")).toMatch(/^31 ธ\.ค\. 2569$/);
  });
  it("ว่าง/ผิดรูปแบบ = null", () => {
    expect(formatReviewDate(null)).toBeNull();
    expect(formatReviewDate("15/02/2026")).toBeNull();
  });
});

describe("todayInBangkok", () => {
  it("ใช้เวลาไทย (UTC+7) ไม่ใช่ UTC", () => {
    expect(todayInBangkok(new Date("2026-11-16T18:30:00Z"))).toBe("2026-11-17");
    expect(todayInBangkok(new Date("2026-11-16T16:30:00Z"))).toBe("2026-11-16");
  });
});

describe("isSocialLink (ตรงกับ backend)", () => {
  it("รับ https บนโดเมนโซเชียล", () => {
    expect(isSocialLink("https://www.facebook.com/iphoneeasyinstallment/reviews")).toBe(true);
    expect(isSocialLink("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isSocialLink("https://www.google.com/maps/place/x")).toBe(true);
  });
  it("ปฏิเสธ http / โดเมนปลอม / userinfo / google search / javascript", () => {
    expect(isSocialLink("http://www.facebook.com/x")).toBe(false);
    expect(isSocialLink("https://facebook.com.evil.example/x")).toBe(false);
    expect(isSocialLink("https://www.facebook.com@evil.example/x")).toBe(false);
    expect(isSocialLink("https://www.google.com/url?q=https://evil.example")).toBe(false);
    expect(isSocialLink("javascript:alert(1)")).toBe(false);
  });
});

describe("sectionSourceUrl", () => {
  const r = (over: Partial<SocialReview>): SocialReview => ({
    id: 1, source: "FACEBOOK", name: "A", text: "B", recommended: true, reviewedOn: null, sourceUrl: null, images: [], ...over,
  });
  it("ใช้ลิงก์ Facebook ของรีวิวแรกที่มี · ไม่มีใช้หน้ารีวิวของร้าน", () => {
    expect(sectionSourceUrl([r({ source: "GOOGLE", sourceUrl: "https://g.page/x" }), r({ sourceUrl: "https://fb.com/r" })])).toBe("https://fb.com/r");
    expect(sectionSourceUrl([r({})])).toBe(FACEBOOK_REVIEWS_URL);
  });
});
