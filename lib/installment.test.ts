import { describe, it, expect } from "vitest";
import { minValidMonthly, buildInstLookup, type InstallmentSerial, cheapestValidTerm } from "./installment";

describe("minValidMonthly — กันข้อมูลกรอกสลับช่อง", () => {
  it("terms ปกติ → คืนค่างวดต่ำสุด", () => {
    expect(minValidMonthly([{ months: 12, monthly: 2190 }, { months: 18, monthly: 1790 }])).toBe(1790);
  });
  it("เคสจริง: months↔monthly สลับ (months=1790, monthly=12) → ตัดทิ้ง คืน null", () => {
    expect(minValidMonthly([{ months: 1790, monthly: 12 }])).toBeNull();
  });
  it("ปนกัน: งวดเพี้ยนถูกตัด เหลือแต่งวดจริง", () => {
    expect(minValidMonthly([{ months: 1790, monthly: 12 }, { months: 12, monthly: 1790 }])).toBe(1790);
  });
  it("monthly ≤ 0 / งวด > 60 / null → ตัดทิ้ง", () => {
    expect(minValidMonthly([{ months: 12, monthly: 0 }])).toBeNull();
    expect(minValidMonthly([{ months: 99, monthly: 1000 }])).toBeNull();
    expect(minValidMonthly([])).toBeNull();
    expect(minValidMonthly(null)).toBeNull();
  });
});

describe("buildInstLookup — UNIT ที่ข้อมูลผ่อนเพี้ยน", () => {
  function serial(over: Partial<InstallmentSerial>): InstallmentSerial {
    return { serialId: "s1", downPayment: 5000, months: null, monthly: null, terms: [], note: null, ...over };
  }
  it("serial iPhone 13 กรอกสลับ (flat monthly=12, months=1790) → ไม่โผล่ ฿12 (monthly=null)", () => {
    const lookup = buildInstLookup([], [serial({ serialId: "u1", monthly: 12, months: 1790, terms: [{ months: 1790, monthly: 12 }] })]);
    expect(lookup({ id: "u1", type: "UNIT" })?.monthly).toBeNull();
  });
  it("serial ปกติ → คืนค่างวดต่ำสุดจาก terms", () => {
    const lookup = buildInstLookup([], [serial({ serialId: "u2", terms: [{ months: 12, monthly: 1790 }, { months: 10, monthly: 1990 }] })]);
    expect(lookup({ id: "u2", type: "UNIT" })?.monthly).toBe(1790);
  });
});

describe("per-term down payment (Stock FIX-200)", () => {
  it("uses the down of the cheapest term when the shop set a different down for that term", () => {
    const lookup = buildInstLookup([
      { productId: "p1", storage: "128", downPayment: 3000, note: null,
        terms: [{ months: 10, monthly: 2190 }, { months: 24, monthly: 1090, down: 5000 }] },
    ], []);
    expect(lookup({ id: "p1", type: "MODEL", options: [{ storage: "128" }] })).toEqual({ down: 5000, monthly: 1090, note: null });
  });

  it("falls back to the plan down when the cheapest term has no override", () => {
    const lookup = buildInstLookup([], [
      { serialId: "s1", downPayment: 1500, months: 10, monthly: 1990, note: "x",
        terms: [{ months: 10, monthly: 1990 }, { months: 12, monthly: 1790, down: 2500 }, { months: 15, monthly: 1490 }] },
    ]);
    expect(lookup({ id: "s1", type: "UNIT" })).toEqual({ down: 1500, monthly: 1490, note: "x" });
  });

  it("cheapestValidTerm ignores swapped-column garbage", () => {
    expect(cheapestValidTerm([{ months: 1790, monthly: 12 }, { months: 12, monthly: 1790, down: 1 }])).toEqual({ months: 12, monthly: 1790, down: 1 });
  });
});
