import { describe, it, expect } from "vitest";
import { modelKey, compareModelNames } from "./modelOrder";

const sortNames = (names: string[], dir: 1 | -1 = 1, brand = "Apple") =>
  [...names].sort((a, b) => compareModelNames({ productName: a, brand }, { productName: b, brand }, dir));

// shuffle แบบคงที่ (เทสต์ไม่ขึ้นกับลำดับ input)
const shuffled = <T,>(arr: T[]) => arr.map((v, i) => [((i * 7919) % 31), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

describe("modelKey — iPhone", () => {
  it("ลำดับทั้งตระกูล iPhone ต่ำ → สูง (ตามรุ่นปี แล้วตามระดับในรุ่น)", () => {
    const expected = [
      "iPhone 6", "iPhone 6 Plus", "iPhone SE", "iPhone 6s", "iPhone 6s Plus",
      "iPhone 7", "iPhone 7 Plus", "iPhone 8", "iPhone 8 Plus",
      "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max",
      "iPhone SE (2nd generation)", "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
      "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
      "iPhone SE (3rd generation)", "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
      "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
      "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
      "iPhone 16e", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
      "iPhone 17", "iPhone Air", "iPhone 17 Pro", "iPhone 17 Pro Max",
      "iPhone 18 Pro", "iPhone 18 Pro Max",
    ];
    expect(sortNames(shuffled(expected))).toEqual(expected);
  });

  it("รุ่นสูง → ต่ำ = กลับด้านพอดี", () => {
    const asc = ["iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone 16e", "iPhone 16", "iPhone 17 Pro Max"];
    expect(sortNames(shuffled(asc), -1)).toEqual([...asc].reverse());
  });

  it("16e ต่ำกว่า 16 (ไม่ใช่ต่อท้าย 16 Pro Max แบบเรียง A-Z)", () => {
    expect(modelKey("iPhone 16e")).toMatchObject({ gen: 16 });
    expect(compareModelNames({ productName: "iPhone 16e" }, { productName: "iPhone 16" })).toBeLessThan(0);
    expect(compareModelNames({ productName: "iPhone 16e" }, { productName: "iPhone 15 Pro Max" })).toBeGreaterThan(0);
  });

  it("ทนชื่อเขียนต่างแบบ: ตัวพิมพ์/ช่องว่าง/คำว่า Apple/เขียนติดกัน", () => {
    expect(modelKey("APPLE iphone 15   pro max")).toEqual(modelKey("iPhone 15 Pro Max"));
    expect(modelKey("iPhone 15Pro")).toEqual(modelKey("iPhone 15 Pro"));
    expect(modelKey("iPhone15ProMax")).toEqual(modelKey("iPhone 15 Pro Max"));
    expect(modelKey("iPhone 14+")).toEqual(modelKey("iPhone 14 Plus"));
    expect(modelKey("iPhone SE 2022")).toEqual(modelKey("iPhone SE (3rd generation)"));
  });
});

describe("modelKey — ยี่ห้ออื่น", () => {
  it("iPhone ขึ้นก่อนยี่ห้ออื่นเสมอ ทั้ง 2 ทิศ", () => {
    const iphone = { productName: "iPhone 17 Pro Max", brand: "Apple" };
    const samsung = { productName: "S26Ultra", brand: "Samsung" };
    expect(compareModelNames(iphone, samsung, 1)).toBeLessThan(0);
    expect(compareModelNames(iphone, samsung, -1)).toBeLessThan(0);
  });

  it("Samsung: ซีรีส์ → เลขรุ่น → ระดับ (FE < ธรรมดา < Plus < Ultra)", () => {
    const expected = ["Galaxy A55", "Galaxy S24 FE", "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "S26Ultra", "Galaxy Z Flip6"];
    expect(sortNames(shuffled(expected), 1, "Samsung")).toEqual(expected);
    expect(modelKey("S26Ultra", "Samsung")).toEqual(modelKey("Samsung Galaxy S26 Ultra", "Samsung"));
  });

  it("ชื่อไม่มีเลขรุ่น → ไม่พัง เรียงชื่อแบบตัวเลข", () => {
    expect(modelKey("Apple EarPods (Lightning Connector)", "Apple").gen).toBe(Number.MAX_SAFE_INTEGER);
    expect(sortNames(["Watch", "AirPods"], 1, "")).toEqual(["AirPods", "Watch"]);
  });
});
