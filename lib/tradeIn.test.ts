import { describe, it, expect } from "vitest";
import { validateTradeIn, buildTradeInMessage, emptyTradeIn, estimatePrice, deductionRatio, PROBLEM_NONE, type TradeInForm } from "./tradeIn";

// ฟอร์มที่กรอกครบถูกต้อง (override เฉพาะ field ที่ต้องการทดสอบ)
function valid(over: Partial<TradeInForm> = {}): TradeInForm {
  return {
    ...emptyTradeIn(),
    model: "iPhone 17 Pro Max", storage: "256GB", color: "Black",
    region: "ZP", battery: "90-100", accessories: "full", warranty: "lt4m",
    body: "none", screen: "none", problems: [PROBLEM_NONE],
    name: "สมชาย ใจดี", tel: "081-234-5678", zipcode: "10250",
    ...over,
  };
}

describe("validateTradeIn", () => {
  it("ฟอร์มครบถูกต้อง → ผ่าน (null)", () => {
    expect(validateTradeIn(valid())).toBeNull();
  });
  it("ไม่กรอกรุ่น → error", () => {
    expect(validateTradeIn(valid({ model: "  " }))).toMatch(/รุ่น/);
  });
  it("ไม่เลือกปัญหาเลย → error (ต้องเลือกไม่มีปัญหาถ้าไม่มี)", () => {
    expect(validateTradeIn(valid({ problems: [] }))).toMatch(/ปัญหา/);
  });
  it("เบอร์โทรผิดรูป → error", () => {
    expect(validateTradeIn(valid({ tel: "abc" }))).toMatch(/เบอร์/);
    expect(validateTradeIn(valid({ tel: "081-234-5678" }))).toBeNull();
  });
  it("รหัสไปรษณีย์ต้อง 5 หลัก", () => {
    expect(validateTradeIn(valid({ zipcode: "102" }))).toMatch(/ไปรษณีย์/);
    expect(validateTradeIn(valid({ zipcode: "10250" }))).toBeNull();
  });
  it("ตรวจตามลำดับ field (รุ่นก่อนความจุ)", () => {
    expect(validateTradeIn(valid({ model: "", storage: "" }))).toMatch(/รุ่น/);
  });
});

describe("buildTradeInMessage", () => {
  it("แปลง value → label ไทยครบ + ใส่ข้อมูลติดต่อ", () => {
    const msg = buildTradeInMessage(valid());
    expect(msg).toContain("iPhone 17 Pro Max");
    expect(msg).toContain("ความจุ: 256GB");
    expect(msg).toContain("เวอร์ชัน: ZP");
    expect(msg).toContain("สุขภาพแบต: 100% - 90%");
    expect(msg).toContain("ปัญหา: ไม่มีปัญหา");
    expect(msg).toContain("เบอร์: 081-234-5678");
    expect(msg).toContain("รหัสไปรษณีย์: 10250");
  });
  it("หลายปัญหา → รวมด้วย comma (ไม่ใช่ 'ไม่มีปัญหา')", () => {
    const msg = buildTradeInMessage(valid({ problems: ["touch", "camera"] }));
    expect(msg).toMatch(/ปัญหา: .*ระบบสัมผัส.*กล้อง/);
    expect(msg).not.toContain("ปัญหา: ไม่มีปัญหา");
  });
  it("สีว่าง → ไม่มีบรรทัดสี", () => {
    expect(buildTradeInMessage(valid({ color: "" }))).not.toContain("สี:");
  });
});

describe("estimatePrice", () => {
  it("สภาพดีสุด (ไม่หัก) → ~ราคาฐาน", () => {
    const f = valid({ battery: "90-100", accessories: "full", warranty: "gte4m", body: "none", screen: "none", region: "TH", problems: [PROBLEM_NONE] });
    expect(estimatePrice(30000, f)).toBe(30000);
  });
  it("จอร้าว (-25%) → หักตามสัดส่วนราคาฐาน", () => {
    const f = valid({ battery: "90-100", accessories: "full", warranty: "gte4m", body: "none", screen: "cracked", region: "TH", problems: [PROBLEM_NONE] });
    expect(estimatePrice(30000, f)).toBe(22500);   // 30000 * 0.75
  });
  it("ราคาสูงหักหนักกว่าราคาต่ำ (% ตามมูลค่า)", () => {
    const cracked = valid({ battery: "90-100", accessories: "full", warranty: "gte4m", body: "none", screen: "cracked", region: "TH", problems: [PROBLEM_NONE] });
    const hi = estimatePrice(40000, cracked)!;   // -10000
    const lo = estimatePrice(10000, cracked)!;   // -2500
    expect(40000 - hi).toBeGreaterThan(10000 - lo);
  });
  it("หักเกิน 85% ถูก clamp + ขั้นต่ำ 500", () => {
    const wreck = valid({ battery: "lt75", accessories: "none", warranty: "lt4m", body: "damaged", screen: "cracked", region: "OTHER", problems: ["touch", "camera", "speaker", "sensor", "call", "biometric"] });
    const est = estimatePrice(3000, wreck)!;
    expect(est).toBeGreaterThanOrEqual(500);
  });
  it("ไม่มีราคาฐาน (null/0) → null", () => {
    expect(estimatePrice(null, valid())).toBeNull();
    expect(estimatePrice(0, valid())).toBeNull();
  });
  it("deductionRatio ไม่เกิน maxDeduct 0.85", () => {
    const wreck = valid({ battery: "lt75", accessories: "none", warranty: "lt4m", body: "damaged", screen: "cracked", region: "OTHER", problems: ["touch", "camera", "speaker", "sensor", "call", "biometric", "home", "buttons", "vibrate", "wireless"] });
    expect(deductionRatio(wreck)).toBeLessThanOrEqual(0.85);
  });
});
