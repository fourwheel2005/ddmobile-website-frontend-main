import { describe, it, expect } from "vitest";
import { minValidMonthly, buildInstLookup, type InstallmentSerial, cheapestValidTerm, downRange, effectiveDown, monthlyForDown, stepDown, quickDowns } from "./installment";

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

describe("FIX-204 — ผ่อนเริ่มบนการ์ดไม่เอาความจุที่ขายหมด", () => {
  const plans = [
    { productId: "pm", storage: "256GB", downPayment: 21900, note: null,
      terms: [{ months: 24, monthly: 2490, down: 21900 }] },
    // ความจุที่หมด แต่ตั้งแผนถูกกว่า — เดิมจะหลุดขึ้นการ์ดเป็น "ผ่อนเริ่ม ฿1,990"
    { productId: "pm", storage: "512GB", downPayment: 9900, note: null,
      terms: [{ months: 24, monthly: 1990, down: 9900 }] },
  ];
  const lookup = buildInstLookup(plans, []);
  it("ใช้เฉพาะความจุที่ยังมีของ", () => {
    const r = lookup({ id: "pm", type: "MODEL", options: [{ storage: "256GB", quantity: 3 }, { storage: "512GB", quantity: 0 }] });
    expect(r?.monthly).toBe(2490);
    expect(r?.down).toBe(21900);
  });
  it("ข้อมูลเก่าที่ไม่มี quantity ยังนับทุกความจุเหมือนเดิม", () => {
    const r = lookup({ id: "pm", type: "MODEL", options: [{ storage: "256GB" }, { storage: "512GB" }] });
    expect(r?.monthly).toBe(1990);
  });
  it("ทุกความจุหมด → ไม่แสดงผ่อนเริ่ม", () => {
    expect(lookup({ id: "pm", type: "MODEL", options: [{ storage: "256GB", quantity: 0 }] })).toBeNull();
  });
});

describe("ลูกค้าเพิ่มเงินดาวน์เอง", () => {
  // เคสจริงจากหน้าเครื่อง: iPhone 15 128GB ราคา 23,900 · ดาวน์ 3,990 · 10/12/18 ด.
  const P = 23900, D = 3990;

  it("ตัวอย่างจากหน้าเว็บ: ดาวน์ 5,000 → ค่างวดลดตามสัดส่วนยอดจัด (ปัดขึ้นหลักสิบ)", () => {
    expect(monthlyForDown(2890, P, D, 5000)).toBe(2750);   // 2890 × 18900/19910 = 2743.4
    expect(monthlyForDown(2590, P, D, 5000)).toBe(2460);   // 2458.6
    expect(monthlyForDown(1890, P, D, 5000)).toBe(1800);   // 1794.1
  });

  it("ยอดรวมที่ลูกค้าจ่ายลดลง (ดอกลดตามยอดจัด) ไม่ใช่แค่ย้ายเงินจากงวดมาดาวน์", () => {
    const before = D + 2890 * 10;
    const after = 5000 + monthlyForDown(2890, P, D, 5000) * 10;
    expect(before).toBe(32890);
    expect(after).toBe(32500);
  });

  it("ดาวน์เท่าเดิม/น้อยกว่า → ค่างวดเดิมเป๊ะ (ไม่ปัดค่าที่ร้านตั้งเลขไม่ลงหลักสิบ)", () => {
    expect(monthlyForDown(2895, P, D, D)).toBe(2895);
    expect(monthlyForDown(2895, P, D, 1000)).toBe(2895);
  });

  it("ปัดขึ้นแล้วไม่มีทางแพงกว่าค่างวดเดิม", () => {
    expect(monthlyForDown(2895, P, D, D + 1)).toBe(2895);   // 2894.85 → ceil10 = 2900 → บีบเหลือ 2895
  });

  it("ลงตัวพอดีหลักสิบ ไม่ปัดเกิน (กัน floating point)", () => {
    // 3000 × 9000/10000 = 2700 พอดี
    expect(monthlyForDown(3000, 12000, 2000, 3000)).toBe(2700);
  });

  it("ยิ่งดาวน์มาก ค่างวดยิ่งลด (monotonic)", () => {
    let prev = Infinity;
    for (let d = D; d <= 11950; d += 250) {
      const m = monthlyForDown(2890, P, D, d);
      expect(m).toBeLessThanOrEqual(prev);
      prev = m;
    }
  });

  it("ช่วงดาวน์: ต่ำสุด = ดาวน์ของแผน · สูงสุด = 50% ของราคา ปัดลงหลักสิบ", () => {
    expect(downRange(P, D)).toEqual({ min: 3990, max: 11950 });
    expect(downRange(23905, D)).toEqual({ min: 3990, max: 11950 });   // 11,952.5 → 11,950
  });

  it("เพิ่มดาวน์ไม่ได้: ไม่มีราคา/ดาวน์ · ดาวน์ของแผนเกิน 50% อยู่แล้ว · ข้อมูลเพี้ยน", () => {
    expect(downRange(null, D)).toBeNull();
    expect(downRange(P, null)).toBeNull();
    expect(downRange(P, 12000)).toBeNull();
    expect(downRange(33900, 16900)).toBeNull();          // เพดาน 16,950 เพิ่มได้แค่ 50 บาท → ไม่โชว์
    expect(downRange(P, 11450)).toEqual({ min: 11450, max: 11950 });   // เหลือ 500 พอดี → โชว์
    expect(downRange(P, P)).toBeNull();
    expect(downRange(0, 0)).toBeNull();
    expect(downRange(P, -1)).toBeNull();
  });

  it("ดาวน์ที่ใช้จริงถูกบีบในช่วงเสมอ", () => {
    const r = downRange(P, D);
    expect(effectiveDown(null, r, D)).toBe(3990);       // ไม่ระบุ = ดาวน์ปกติ
    expect(effectiveDown(50, r, D)).toBe(3990);         // ต่ำกว่าขั้นต่ำ (กำลังพิมพ์) → ดาวน์ปกติ
    expect(effectiveDown(5000, r, D)).toBe(5000);
    expect(effectiveDown(99999, r, D)).toBe(11950);     // เกินเพดาน → สูงสุด
    expect(effectiveDown(5000.6, r, D)).toBe(5001);     // บาทเต็ม (backend เก็บ Integer)
    expect(effectiveDown(5000, null, D)).toBe(3990);    // เพิ่มดาวน์ไม่ได้ → ดาวน์ปกติ
    expect(effectiveDown(NaN, r, D)).toBe(3990);
  });
});

describe("ปุ่มปรับดาวน์", () => {
  const r = { min: 3990, max: 11950 };

  it("+ ขยับเข้าเลขกลมทีละ 500", () => {
    expect(stepDown(3990, 1, r)).toBe(4500);
    expect(stepDown(4500, 1, r)).toBe(5000);
    expect(stepDown(5000, 1, r)).toBe(5500);
    expect(stepDown(4010, 1, r)).toBe(4500);
  });

  it("− ขยับลงเข้าเลขกลม และไม่ต่ำกว่าดาวน์ปกติ", () => {
    expect(stepDown(5000, -1, r)).toBe(4500);
    expect(stepDown(4500, -1, r)).toBe(4000);
    expect(stepDown(4000, -1, r)).toBe(3990);
    expect(stepDown(3990, -1, r)).toBe(3990);
  });

  it("+ ไม่เกินเพดาน", () => {
    expect(stepDown(11500, 1, r)).toBe(11950);
    expect(stepDown(11950, 1, r)).toBe(11950);
  });

  it("ปุ่มลัด: ปกติ · 2 ค่ากลม · สูงสุด", () => {
    expect(quickDowns(r)).toEqual([3990, 7000, 9000, 11950]);
  });

  it("ช่วงแคบ → ค่ากลางที่ชนขอบ/ซ้ำถูกตัด (2–4 ปุ่มเสมอ)", () => {
    expect(quickDowns({ min: 4990, max: 5450 })).toEqual([4990, 5450]);
    const v = quickDowns({ min: 2990, max: 5950 });
    expect(v[0]).toBe(2990);
    expect(v[v.length - 1]).toBe(5950);
    expect(new Set(v).size).toBe(v.length);
    expect(v.length).toBeGreaterThanOrEqual(2);
    expect(v.length).toBeLessThanOrEqual(4);
  });
});
