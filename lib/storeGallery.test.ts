import { describe, expect, it } from "vitest";
import { bentoLayout, hasProfile } from "./storeGallery";

describe("bentoLayout — ตารางรูปหน้าร้านสมมาตรตามจำนวนรูป", () => {
  it("จำนวนช่อง = จำนวนรูป (สูงสุด 5)", () => {
    for (const n of [0, 1, 2, 3, 4, 5, 9]) expect(bentoLayout(n).tiles).toHaveLength(Math.min(n, 5));
  });
  it("3 และ 5+ รูป: รูปแรกกินสองแถว (ใหญ่ซ้าย) · ช่องอื่นขนาดเท่ากัน", () => {
    for (const n of [3, 5, 8]) {
      const { tiles } = bentoLayout(n);
      expect(tiles[0]).toContain("md:row-span-2");
      expect(new Set(tiles.slice(1)).size).toBe(1);
    }
  });
  it("2 และ 4 รูป: ทุกช่องเท่ากัน", () => {
    for (const n of [2, 4]) expect(new Set(bentoLayout(n).tiles).size).toBe(1);
  });
});

describe("hasProfile", () => {
  it("มีอย่างน้อยหนึ่งช่อง = แสดงส่วนการเดินทาง", () => {
    const empty = { address: null, landmark: null, hours: null, mapsUrl: null, parking: null };
    expect(hasProfile(empty)).toBe(false);
    expect(hasProfile({ ...empty, hours: "ทุกวัน" })).toBe(true);
  });
});
