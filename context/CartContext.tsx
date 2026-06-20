"use client";
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

export interface CartItem {
  catalogId: string;        // = CatalogItem.id (UNIT: serialId · GROUP: variantId|condition)
  type: "UNIT" | "GROUP";
  productName: string;
  variantId: string;
  condition: string;
  conditionLabel: string;
  sku: string;
  color: string | null;
  storage: string | null;
  imageUrl: string | null;
  unitPrice: number;        // ราคาตอนหยิบ (server จะ re-validate ตอนสร้างออเดอร์)
  maxStock: number;         // จำนวนพร้อมขาย (UNIT = 1)
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => { ok: boolean; reason?: string };
  remove: (catalogId: string) => void;
  setQty: (catalogId: string, qty: number) => void;
  clear: () => void;
  has: (catalogId: string) => boolean;
}

const STORAGE_KEY = "dd_cart";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // โหลดจาก localStorage ครั้งแรก
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  // บันทึกทุกครั้งที่เปลี่ยน (หลังโหลดเสร็จ)
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const add: CartCtx["add"] = useCallback((item, qty = 1) => {
    let result: { ok: boolean; reason?: string } = { ok: true };
    setItems((prev) => {
      const existing = prev.find((i) => i.catalogId === item.catalogId);
      if (item.type === "UNIT") {
        // มือถือ: 1 เครื่อง หยิบซ้ำไม่ได้
        if (existing) { result = { ok: false, reason: "เครื่องนี้อยู่ในตะกร้าแล้ว" }; return prev; }
        return [...prev, { ...item, quantity: 1 }];
      }
      // อุปกรณ์เสริม: เพิ่มจำนวนได้ถึง maxStock
      const current = existing?.quantity ?? 0;
      const next = Math.min(current + qty, item.maxStock);
      if (next <= current) { result = { ok: false, reason: "ครบจำนวนที่มีในคลังแล้ว" }; return prev; }
      if (existing) return prev.map((i) => i.catalogId === item.catalogId ? { ...i, quantity: next } : i);
      return [...prev, { ...item, quantity: next }];
    });
    return result;
  }, []);

  const remove: CartCtx["remove"] = useCallback((id) =>
    setItems((prev) => prev.filter((i) => i.catalogId !== id)), []);

  const setQty: CartCtx["setQty"] = useCallback((id, qty) =>
    setItems((prev) => prev.map((i) =>
      i.catalogId === id ? { ...i, quantity: Math.max(1, Math.min(qty, i.maxStock)) } : i)), []);

  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((id: string) => items.some((i) => i.catalogId === id), [items]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, count, total, add, remove, setQty, clear, has }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
