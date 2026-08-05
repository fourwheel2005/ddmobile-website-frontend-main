import { describe, it, expect } from "vitest";
import { applyToggle, COMPARE_MAX } from "./useCompare";

// S13/UX-03: กฎเลือกเปรียบเทียบ 2–3 รายการ (ตรรกะล้วน ไม่พึ่ง storage)
describe("applyToggle", () => {
  it("เพิ่มรายการใหม่เมื่อยังไม่เต็ม", () => {
    expect(applyToggle([], "a")).toEqual({ ids: ["a"], ok: true });
    expect(applyToggle(["a"], "b")).toEqual({ ids: ["a", "b"], ok: true });
  });

  it("ถอดออกเมื่อมีอยู่แล้ว (toggle)", () => {
    expect(applyToggle(["a", "b"], "a")).toEqual({ ids: ["b"], ok: true });
  });

  it("ปฏิเสธเมื่อเต็ม (คงรายการเดิม, ok=false)", () => {
    const full = ["a", "b", "c"];
    expect(full.length).toBe(COMPARE_MAX);
    expect(applyToggle(full, "d")).toEqual({ ids: full, ok: false });
  });

  it("ยังถอดออกได้แม้เต็ม (ลดจำนวนลง)", () => {
    expect(applyToggle(["a", "b", "c"], "b")).toEqual({ ids: ["a", "c"], ok: true });
  });
});
