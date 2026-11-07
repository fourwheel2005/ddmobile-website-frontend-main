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

  // FIX-220: ร้านกรอกผลตรวจใน Stock แล้ว → ทุกแถวมีค่า และไม่มีข้อความ "ยังไม่ได้ระบุ"
  it("ผลตรวจครบจาก Stock → ไม่มีแถวที่ยังไม่ได้ระบุ", () => {
    const html = renderToStaticMarkup(
      <ProductConfidence data={{
        grade: "B", batteryHealth: 89, batteryCheckedAt: "2026-11-07T03:00:00Z", warrantyTerms: "ประกันร้าน 30 วัน",
        photoCount: 5, stockState: "AVAILABLE",
        inspection: { screen: "ปกติ", body: "มีรอยเล็กน้อย · รอยที่ขอบ", camera: "ปกติ", faceId: "ปกติ" },
        accessories: "กล่อง + สายชาร์จ", defectNotes: "มีรอยขนแมวหลังเครื่อง",
      }} />
    );
    expect(html).not.toContain("ยังไม่ได้ระบุ");
    expect(html).toContain("ประกันร้าน 30 วัน");
    expect(html).toContain("มีรอยเล็กน้อย · รอยที่ขอบ");
    expect(html).toContain("กล่อง + สายชาร์จ");
  });

  it("มีวันหมดประกัน → โชว์วันที่ก่อนข้อความ", () => {
    const html = renderToStaticMarkup(<ProductConfidence data={{ warrantyExpire: "2027-01-31", warrantyTerms: "ประกันศูนย์" }} />);
    expect(html).toContain("ถึง ");
    expect(html).not.toContain("ประกันศูนย์");
  });
});
