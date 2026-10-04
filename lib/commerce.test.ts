import { describe, it, expect } from "vitest";
import { bestCoupon, buildBuyMessage, buildCartMessage, buyStatus, intentForCondition, WEB_CHECKOUT } from "./commerce";
import type { CartItem } from "@/context/CartContext";

describe("WEB_CHECKOUT", () => {
  it("ค่าเริ่มต้น = ปิดการสั่งบนเว็บ (ไม่ตั้ง env)", () => expect(WEB_CHECKOUT).toBe(false));
});

describe("buyStatus — ชุดเดียวกับเงื่อนไขปุ่มเดิม (ยึดตัวเลือกที่เลือกอยู่)", () => {
  it("ขายแล้ว > ไม่มีราคา > หมด > พร้อมขาย", () => {
    expect(buyStatus(true, 5, 1000)).toBe("sold");
    expect(buyStatus(false, 5, null)).toBe("ask-price");
    expect(buyStatus(false, 0, 1000)).toBe("out");
    expect(buyStatus(false, 1, 1000)).toBe("available");
  });
});

describe("bestCoupon", () => {
  const now = Date.parse("2026-10-03T00:00:00Z");
  it("เลือกโค้ดที่ลดมากสุดที่ยังไม่หมดอายุ · ไม่มี → null", () => {
    expect(bestCoupon([
      { code: "A5", percent: 5, expiresAt: null },
      { code: "B20", percent: 20, expiresAt: "2026-10-01T00:00:00Z" },   // หมดอายุแล้ว
      { code: "C10", percent: 10, expiresAt: "2026-12-01T00:00:00Z" },
    ], now)?.code).toBe("C10");
    expect(bestCoupon([], now)).toBeNull();
  });
});

describe("buildBuyMessage — ข้อมูลครบให้แอดมินปิดการขายในแชทได้ทันที", () => {
  const base = {
    productName: "iPhone 17", color: "Pink", storage: "128GB", conditionLabel: "มือ 1", code: "SKU-17",
    price: 29900, url: "https://shop.example/products/abc?variant=v1", buyer: { name: "สมชาย", tel: "0812345678" },
  };
  it("พร้อมขาย: รุ่น/สเปก/รหัส/ราคา/โปร/คูปอง/ลิงก์/ผู้ซื้อ", () => {
    const m = buildBuyMessage({ ...base, status: "available",
      promo: { name: "Flash Sale ต้นเดือน", label: "-฿1,000", priceAfter: 28900 }, coupon: { code: "DD10", percent: 10, expiresAt: null } });
    expect(m).toContain("🛒 สนใจซื้อเครื่องนี้ (ซื้อสด)");
    expect(m).toContain("สเปก: Pink · 128GB · มือ 1");
    expect(m).toContain("รหัส: SKU-17");
    expect(m).toContain("ราคา: ฿29,900");
    expect(m).toContain("Flash Sale ต้นเดือน (-฿1,000) เหลือ ฿28,900");
    expect(m).toContain("โค้ดส่วนลดของฉัน: DD10 (ลด 10%)");
    expect(m).toContain("ดูเครื่อง: https://shop.example/products/abc?variant=v1");
    expect(m).toContain("ชื่อ: สมชาย");
    expect(m).toContain("เบอร์: 0812345678");
  });
  it("ขายแล้ว/หมด: ไม่แนบโปร/คูปอง (ไม่ชวนเข้าใจผิดว่ายังได้ราคานี้)", () => {
    const sold = buildBuyMessage({ ...base, status: "sold", promo: { name: "X", label: "-1", priceAfter: 1 }, coupon: { code: "DD10", percent: 10, expiresAt: null } });
    expect(sold).toContain("ขายแล้ว");
    expect(sold).not.toContain("โค้ดส่วนลด");
    expect(sold).not.toContain("⚡");
    expect(buildBuyMessage({ ...base, status: "out" })).toContain("สั่งจอง");
  });
  it("ไม่มีราคา: ไม่พิมพ์บรรทัดราคา · ไม่มีผู้ซื้อ: ไม่มีบรรทัดชื่อ", () => {
    const m = buildBuyMessage({ ...base, status: "ask-price", price: null, buyer: null });
    expect(m).toContain("สอบถามราคา");
    expect(m).not.toContain("ราคา: ");
    expect(m).not.toContain("ชื่อ:");
  });
});

describe("buildCartMessage — ตะกร้าเดิมส่งเข้า LINE ได้ ของไม่หาย", () => {
  const item = (over: Partial<CartItem>): CartItem => ({
    catalogId: "1", type: "UNIT", productName: "iPhone 15", variantId: "v", condition: "SECOND_HAND", conditionLabel: "มือ 2",
    sku: "U-1", color: "Black", storage: "128GB", imageUrl: null, unitPrice: 17900, maxStock: 1, quantity: 1, ...over,
  });
  it("ทุกรายการ + ยอดรวมโดยประมาณ + คูปอง + ผู้ซื้อ", () => {
    const m = buildCartMessage([item({}), item({ catalogId: "2", productName: "EarPods", type: "GROUP", unitPrice: 790, quantity: 2, sku: "", color: null, storage: null, conditionLabel: "มือ 1" })],
      { name: "สมชาย", tel: "0812345678" }, { code: "DD5", percent: 5, expiresAt: null });
    expect(m).toContain("สนใจซื้อ 2 รายการ");
    expect(m).toContain("1. iPhone 15 (Black · 128GB · มือ 2) x1 — ฿17,900 [U-1]");
    expect(m).toContain("2. EarPods (มือ 1) x2 — ฿1,580");
    expect(m).toContain("รวมโดยประมาณ: ฿19,480");
    expect(m).toContain("DD5");
    expect(m).toContain("เบอร์: 0812345678");
  });
});

describe("intentForCondition", () => {
  it("มือ 1 = NEW · อื่น ๆ = USED (สถิติบริการที่ลูกค้าสนใจ)", () => {
    expect(intentForCondition("NEW")).toBe("NEW");
    expect(intentForCondition("SECOND_HAND")).toBe("USED");
  });
});
