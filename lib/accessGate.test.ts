import { describe, it, expect } from "vitest";
import { gate, isPublicPath, membersWallEnabled, safeRedirect } from "./accessGate";

describe("gate — กำแพงสมาชิก", () => {
  it("หน้าสาธารณะ: หน้าแรก + แนะนำบริการ + ล็อกอิน/นโยบาย/ติดต่อ เข้าได้โดยไม่ล็อกอิน", () => {
    for (const p of ["/", "/login", "/privacy", "/contact", "/sell", "/trade-in", "/services", "/installments"]) {
      expect(gate(p, "", undefined)).toEqual({ type: "allow" });
    }
  });
  it("ลิงก์ระบบ /r (รูปเครื่องจากแชท LINE) และ /d (QR หน้าร้าน) ต้องไม่ถูกกั้น", () => {
    expect(gate("/r/AbCdEfGhIjKlMnOpQrStUv", "", undefined)).toEqual({ type: "allow" });
    expect(gate("/d/ABC123", "", undefined)).toEqual({ type: "allow" });
  });
  it("ไม่ล็อกอิน → /login พร้อมหน้าเดิม (รวม query เช่น ?variant=)", () => {
    expect(gate("/products/abc", "?variant=v1&returnTo=%2Fproducts", undefined)).toEqual({
      type: "redirect", location: "/login?redirect=%2Fproducts%2Fabc%3Fvariant%3Dv1%26returnTo%3D%252Fproducts",
    });
  });
  it("allowlist: หน้าที่ไม่ได้ประกาศว่าสาธารณะ (รวมหน้าใหม่ในอนาคต) ถูกล็อกเสมอ", () => {
    for (const p of ["/products", "/compare", "/cart", "/checkout", "/orders", "/orders/9", "/profile", "/admin", "/employee", "/some-new-page"]) {
      expect(gate(p, "", undefined).type).toBe("redirect");
    }
    expect(isPublicPath("/sell/extra")).toBe(false);   // ตรงตัวเท่านั้น ไม่ใช่ prefix
    expect(isPublicPath("/rx")).toBe(false);
  });
  it("ล็อกอินแล้วแต่ข้อมูลไม่ครบ → /profile?complete=1 · หน้าโปรไฟล์เองเข้าได้ (ไม่วน)", () => {
    expect(gate("/products", "", "i")).toEqual({ type: "redirect", location: "/profile?complete=1&redirect=%2Fproducts" });
    expect(gate("/profile", "?complete=1&redirect=%2Fproducts", "i")).toEqual({ type: "allow" });
  });
  it("สมาชิกข้อมูลครบ → เข้าได้ทุกหน้า · cookie ค่ามั่ว = ไม่ล็อกอิน", () => {
    expect(gate("/checkout", "", "c")).toEqual({ type: "allow" });
    expect(gate("/checkout", "", "admin").type).toBe("redirect");
  });
});

describe("สวิตช์ฉุกเฉิน NEXT_PUBLIC_MEMBERS_WALL", () => {
  it("off → เปิดทุกหน้าเหมือนก่อนมีกำแพง · ค่าอื่น/ไม่ตั้ง → กำแพงทำงาน", () => {
    expect(membersWallEnabled("off")).toBe(false);
    expect(membersWallEnabled(undefined)).toBe(true);
    expect(membersWallEnabled("on")).toBe(true);
    expect(gate("/products", "", undefined, false)).toEqual({ type: "allow" });
    expect(gate("/checkout", "", "i", false)).toEqual({ type: "allow" });
    expect(gate("/products", "", undefined, true).type).toBe("redirect");
  });
});

describe("safeRedirect", () => {
  it("รับเฉพาะ path ในเว็บ — กัน open redirect", () => {
    expect(safeRedirect("/products/abc?x=1")).toBe("/products/abc?x=1");
    expect(safeRedirect("//evil.com")).toBeNull();
    expect(safeRedirect("/\\evil.com")).toBeNull();
    expect(safeRedirect("https://evil.com")).toBeNull();
    expect(safeRedirect(null)).toBeNull();
  });
});
