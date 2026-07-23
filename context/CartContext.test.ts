import { describe, it, expect } from "vitest";
import { sanitizeCart, pickOwnedItems, type CartItem } from "./CartContext";

// ตะกร้าตัวอย่าง (ระบุเฉพาะ field ที่จำเป็น ที่เหลือ default valid)
function item(over: Partial<CartItem> = {}): CartItem {
  return {
    catalogId: "c1", type: "GROUP", productName: "สายชาร์จ", variantId: "v1",
    condition: "NEW", conditionLabel: "มือ 1", sku: "SKU", color: null, storage: null,
    imageUrl: null, unitPrice: 100, maxStock: 5, quantity: 2, ...over,
  };
}

describe("sanitizeCart", () => {
  it("clamp quantity เป็นจำนวนเต็ม 1..maxStock", () => {
    expect(sanitizeCart([item({ quantity: -5, maxStock: 5 })])[0].quantity).toBe(1);
    expect(sanitizeCart([item({ quantity: 999, maxStock: 5 })])[0].quantity).toBe(5);
    expect(sanitizeCart([item({ quantity: 2.9, maxStock: 5 })])[0].quantity).toBe(2);
  });
  it("ตัด item ที่ผิดรูป (ไม่มี catalogId/productName) ทิ้ง", () => {
    expect(sanitizeCart([{ foo: 1 }, item()])).toHaveLength(1);
    expect(sanitizeCart("ไม่ใช่ array")).toEqual([]);
  });
  it("unitPrice ติดลบ → 0 (ราคาจริงคิดที่ server อยู่แล้ว)", () => {
    expect(sanitizeCart([item({ unitPrice: -50 })])[0].unitPrice).toBe(0);
  });
});

describe("pickOwnedItems — กันตะกร้าค้างข้ามบัญชี", () => {
  const cart = (owner: string | null) => ({ owner, items: [item()] });

  it("เจ้าของตรงกับ user ปัจจุบัน → เก็บตะกร้าไว้", () => {
    expect(pickOwnedItems(cart("a@x.com"), "a@x.com")).toHaveLength(1);
  });
  it("เจ้าของเป็นบัญชีอื่น → ล้างทิ้ง (นี่คือบั๊กที่รายงาน)", () => {
    expect(pickOwnedItems(cart("a@x.com"), "b@x.com")).toEqual([]);
  });
  it("logout: เจ้าของเป็น user เดิม แต่ตอนนี้เป็น guest (null) → ล้างทิ้ง", () => {
    expect(pickOwnedItems(cart("a@x.com"), null)).toEqual([]);
  });
  it("ตะกร้า guest (owner=null) → guest เก็บได้ (flow guest→checkout)", () => {
    expect(pickOwnedItems(cart(null), null)).toHaveLength(1);
  });
  it("ตะกร้า guest (owner=null) + เพิ่งล็อกอิน → adopt (เก็บไว้ให้ user ใหม่)", () => {
    expect(pickOwnedItems(cart(null), "b@x.com")).toHaveLength(1);
  });

  // legacy format (array ล้วน ไม่มี owner) — กัน leak: ล็อกอินอยู่ให้ล้าง, guest เก็บได้
  it("legacy array + ล็อกอินอยู่ → ล้าง (เชื่อ owner ไม่ได้ กัน leak)", () => {
    expect(pickOwnedItems([item()], "b@x.com")).toEqual([]);
  });
  it("legacy array + guest → เก็บได้", () => {
    expect(pickOwnedItems([item()], null)).toHaveLength(1);
  });
});
