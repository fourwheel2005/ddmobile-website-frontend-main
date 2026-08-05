import { describe, it, expect } from "vitest";
import { validateTradeIn, buildTradeInMessage, emptyTradeIn, estimatePrice, deductionRatio, PROBLEM_NONE, makeTradeInRef, buildTradeInPayload, type TradeInForm } from "./tradeIn";

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
  it("ส่ง refCode → มีบรรทัดอ้างอิงให้แอดมินเปิดคำขอเดียวกันใน DB", () => {
    expect(buildTradeInMessage(valid(), "DD-A2B3C4")).toContain("อ้างอิง: DD-A2B3C4");
  });
  it("ไม่ส่ง refCode → ไม่มีบรรทัดอ้างอิง (ของเดิมไม่พัง)", () => {
    expect(buildTradeInMessage(valid())).not.toContain("อ้างอิง:");
  });
});

describe("makeTradeInRef", () => {
  it("รูปแบบ DD- ตามด้วย 6 ตัว และไม่มีอักษรที่อ่านสับสน (0 O 1 I L)", () => {
    for (let i = 0; i < 200; i++) expect(makeTradeInRef()).toMatch(/^DD-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
  it("ยาวไม่เกิน column ref_code VARCHAR(16)", () => {
    expect(makeTradeInRef().length).toBeLessThanOrEqual(16);
  });
  it("สุ่มไม่ซ้ำกันเป็นก้อน (กัน implementation ที่คืนค่าคงที่)", () => {
    const set = new Set(Array.from({ length: 300 }, () => makeTradeInRef()));
    expect(set.size).toBeGreaterThan(290);
  });
});

describe("buildTradeInPayload", () => {
  it("ส่ง code ไม่ใช่ label ไทย — label เปลี่ยนคำแล้วข้อมูลเก่าไม่เพี้ยน", () => {
    const p = buildTradeInPayload(valid(), "DD-A2B3C4", 22500);
    expect(p).toMatchObject({
      refCode: "DD-A2B3C4", deviceType: "iphone", model: "iPhone 17 Pro Max", storage: "256GB",
      region: "ZP", battery: "90-100", accessories: "full", warranty: "lt4m",
      body: "none", screen: "none", problems: [PROBLEM_NONE], zipcode: "10250", estimatedPrice: 22500,
    });
  });
  it("ตัดช่องว่างหัวท้าย (ชื่อ/รุ่น/เบอร์) ก่อนส่งขึ้น server", () => {
    const p = buildTradeInPayload(valid({ name: "  สมชาย  ", model: " iPhone 15 ", tel: " 081-234-5678 " }), "DD-AAAAAA", null);
    expect(p.name).toBe("สมชาย");
    expect(p.model).toBe("iPhone 15");
    expect(p.tel).toBe("081-234-5678");
  });
  it("สีว่าง → null (column nullable ไม่ใช่ string ว่าง)", () => {
    expect(buildTradeInPayload(valid({ color: "   " }), "DD-AAAAAA", null).color).toBeNull();
  });
  it("ไม่มีราคาประเมิน → estimatedPrice null", () => {
    expect(buildTradeInPayload(valid(), "DD-AAAAAA", null).estimatedPrice).toBeNull();
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

// S15/Part A: lifecycle stepper (mirror backend TradeInLifecycle)
import { nextTradeInStatuses, TRADEIN_OUTCOMES } from "./tradeIn";
describe("nextTradeInStatuses (CRM lifecycle)", () => {
  it("เดินหน้าตามลำดับ + แตกไป outcome ได้", () => {
    expect(nextTradeInStatuses("NEW")).toContain("CONTACTED");
    expect(nextTradeInStatuses("OFFERED")).toEqual(expect.arrayContaining(["WON", "LOST", "ARCHIVED"]));
  });
  it("สถานะปิดแล้วไปต่อไม่ได้ (archived = ว่าง)", () => {
    expect(nextTradeInStatuses("ARCHIVED")).toEqual([]);
    expect(nextTradeInStatuses("NEW")).not.toContain("OFFERED");   // ห้ามข้ามขั้น
  });
  it("WON/LOST/ARCHIVED เป็น outcome ที่ต้องมีเหตุผล", () => {
    expect(TRADEIN_OUTCOMES).toEqual(expect.arrayContaining(["WON", "LOST", "ARCHIVED"]));
  });
});
