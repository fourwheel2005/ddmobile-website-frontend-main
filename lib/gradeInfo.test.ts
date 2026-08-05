import { describe, it, expect } from "vitest";
import { gradeDescription, GRADE_LEGEND } from "./gradeInfo";

// S13/UX-03: อธิบายเกรด (reference ของร้าน) — normalize + ไม่เดาเกรดที่ไม่รู้จัก
describe("gradeDescription", () => {
  it("คืนคำอธิบายตามเกรด (normalize ตัวพิมพ์/ช่องว่าง)", () => {
    expect(gradeDescription("A")).toBe(GRADE_LEGEND.A);
    expect(gradeDescription(" b ")).toBe(GRADE_LEGEND.B);
  });

  it("คืน null เมื่อไม่มีเกรด/เกรดไม่รู้จัก (ไม่เดา)", () => {
    expect(gradeDescription(null)).toBeNull();
    expect(gradeDescription("")).toBeNull();
    expect(gradeDescription("Z")).toBeNull();
  });
});
