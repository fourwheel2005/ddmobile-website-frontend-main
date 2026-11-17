import { describe, expect, it } from "vitest";
import { loopDuration, loopSet, tileAspect } from "./reviewPhotos";

describe("tileAspect — กรอบรูปในแถบเลื่อน", () => {
  it("ใช้สัดส่วนจริงในช่วงปกติ", () => {
    expect(tileAspect(1600, 1200)).toBeCloseTo(4 / 3);
    expect(tileAspect(900, 1200)).toBeCloseTo(0.75);
  });
  it("จำกัดรูปแนวตั้งยาว/แนวนอนยาว · ขนาดเพี้ยน = จัตุรัส", () => {
    expect(tileAspect(400, 2000)).toBe(0.6);
    expect(tileAspect(3000, 600)).toBe(1.6);
    expect(tileAspect(0, 100)).toBe(1);
    expect(tileAspect(Number.NaN, 100)).toBe(1);
  });
});

describe("loopSet — ชุดรูปหนึ่งรอบ", () => {
  const p = (id: number) => ({ id });
  it("รูปน้อย → ทวนจนอย่างน้อย 10 ชิ้น · key ไม่ซ้ำ · ลำดับตามเดิม", () => {
    const s = loopSet([p(1), p(2), p(3)]);
    expect(s).toHaveLength(12);
    expect(new Set(s.map((x) => x.key)).size).toBe(12);
    expect(s.slice(0, 4).map((x) => x.photo.id)).toEqual([1, 2, 3, 1]);
  });
  it("รูปพอแล้ว = ชุดเดียว · ไม่มีรูป = ว่าง", () => {
    expect(loopSet(Array.from({ length: 12 }, (_, i) => p(i)))).toHaveLength(12);
    expect(loopSet([])).toEqual([]);
  });
  it("ความเร็ว ~4.5 วิ/รูป ขั้นต่ำ 30 วิ", () => {
    expect(loopDuration(4)).toBe(30);
    expect(loopDuration(20)).toBe(90);
  });
});
