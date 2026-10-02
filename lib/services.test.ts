import { describe, it, expect } from "vitest";
import { SERVICES, needsDevice, parseServices, toggleService } from "./services";

describe("SERVICES", () => {
  it("ชื่อบริการแลกเงินเปลี่ยนเป็น ผ่อนบอลลูน (บริการแลกเงิน) · URL เดิม /trade-in คงไว้", () => {
    expect(SERVICES.BALLOON.label).toBe("ผ่อนบอลลูน (บริการแลกเงิน)");
    expect(SERVICES.BALLOON.href).toBe("/trade-in");
    expect(SERVICES.SELL.href).toBe("/sell");
  });
});

describe("parseServices", () => {
  it("อ่าน query (ตัวพิมพ์เล็ก/ช่องว่างได้) · ทิ้งค่ามั่ว/ซ้ำ", () => {
    expect(parseServices(" sell , INSTALLMENT,hack,SELL")).toEqual(["SELL", "INSTALLMENT"]);
  });
  it("ขายเครื่อง + ผ่อนบอลลูน พร้อมกัน → เก็บตัวแรก", () => {
    expect(parseServices("BALLOON,SELL")).toEqual(["BALLOON"]);
  });
  it("ว่าง/null → fallback", () => {
    expect(parseServices(null)).toEqual([]);
    expect(parseServices("", ["SELL"])).toEqual(["SELL"]);
  });
});

describe("toggleService", () => {
  it("ติ๊ก/เอาออก + เรียงตามลำดับมาตรฐานเสมอ", () => {
    expect(toggleService(["BALLOON"], "INSTALLMENT")).toEqual(["INSTALLMENT", "BALLOON"]);
    expect(toggleService(["SELL", "INSTALLMENT"], "SELL")).toEqual(["INSTALLMENT"]);
  });
  it("ติ๊กขายเครื่อง → ผ่อนบอลลูนหลุด (และกลับกัน) · ผ่อนเครื่องไม่กระทบ", () => {
    expect(toggleService(["BALLOON", "INSTALLMENT"], "SELL")).toEqual(["SELL", "INSTALLMENT"]);
    expect(toggleService(["SELL"], "BALLOON")).toEqual(["BALLOON"]);
  });
  it("needsDevice เฉพาะขายเครื่อง/ผ่อนบอลลูน", () => {
    expect(needsDevice(["INSTALLMENT"])).toBe(false);
    expect(needsDevice(["INSTALLMENT", "SELL"])).toBe(true);
  });
});
