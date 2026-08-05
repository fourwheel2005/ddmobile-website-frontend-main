import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import ProductConfidence from "./ProductConfidence";

// S13/UX-03: กล่อง confidence ต้อง "ซื่อสัตย์" — โชว์ของจริง + "ยังไม่ได้ระบุ" ห้าม default หลอกว่าตรวจแล้ว
describe("ProductConfidence", () => {
  it("โชว์ข้อมูลจริงจาก Stock (แบต/เกรด/รูป)", () => {
    const html = renderToStaticMarkup(
      <ProductConfidence data={{ grade: "A", batteryHealth: 92, photoCount: 5, stockState: "AVAILABLE", warrantyExpire: "2026-12-31" }} />
    );
    expect(html).toContain("92%");
    expect(html).toContain("เกรด A");
    expect(html).toContain("5 รูป");
    expect(html).toContain("พร้อมขาย");
  });

  it("field ที่ Stock ไม่ส่ง → 'ยังไม่ได้ระบุ' (ตรวจสภาพ/อุปกรณ์/ตำหนิ)", () => {
    const html = renderToStaticMarkup(<ProductConfidence data={{ grade: "B", batteryHealth: 80 }} />);
    expect(html).toContain("ยังไม่ได้ระบุ");
    // เวลาที่ตรวจแบตไม่มี → ต้องขึ้นยังไม่ได้ระบุ ไม่แต่งวันเอง
    expect(html).toContain("ตรวจเมื่อ");
  });

  it("ห้ามมี default ที่ดูเหมือนตรวจแล้ว (plan S13)", () => {
    const html = renderToStaticMarkup(<ProductConfidence data={{ batteryHealth: 88 }} />);
    expect(html).not.toContain("ผ่านการตรวจสอบคุณภาพ");
    expect(html).not.toContain("แบตเตอรี่พร้อมใช้");
    expect(html).not.toContain("เครื่องแท้ 100%");
  });
});
