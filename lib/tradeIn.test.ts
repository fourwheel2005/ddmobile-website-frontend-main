import { describe, it, expect } from "vitest";
import { validateTradeIn, buildTradeInMessage, emptyTradeIn, PROBLEM_NONE, type TradeInForm } from "./tradeIn";

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
