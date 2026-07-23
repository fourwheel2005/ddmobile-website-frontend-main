"use client";
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";

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

/**
 * ทำความสะอาด cart ที่โหลดจาก localStorage — กันค่าที่ถูกแก้มือ (quantity ติดลบ/ทศนิยม/ยักษ์, ราคาเพี้ยน)
 * ราคาจริงคิดที่ server อยู่แล้ว แต่ quantity ถูกส่งไป /orders → ต้อง clamp เป็นจำนวนเต็มบวก ≤ maxStock
 */
export function sanitizeCart(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const c = it as Record<string, unknown>;
    if (typeof c.catalogId !== "string" || typeof c.productName !== "string") continue;
    const maxStock = Number.isFinite(Number(c.maxStock)) ? Math.max(1, Math.floor(Number(c.maxStock))) : 1;
    const qty = Math.max(1, Math.min(Math.floor(Number(c.quantity) || 1), maxStock));
    const unitPrice = Number.isFinite(Number(c.unitPrice)) ? Math.max(0, Number(c.unitPrice)) : 0;
    out.push({ ...(it as CartItem), quantity: qty, maxStock, unitPrice });
  }
  return out;
}

/** อีเมลผู้ใช้ที่ล็อกอินอยู่ (null = guest) — ใช้ผูก "เจ้าของตะกร้า" กันตะกร้าค้างข้ามบัญชี */
function currentUserEmail(): string | null {
  try {
    const u = localStorage.getItem("user");
    if (!u) return null;
    const p = JSON.parse(u) as { email?: unknown };
    return typeof p?.email === "string" ? p.email : null;
  } catch { return null; }
}

/**
 * โหลดตะกร้าจาก localStorage โดยเช็ค "เจ้าของ" — กัน bug ตะกร้าค้างเมื่อสลับบัญชี/หลัง logout
 * - รูปแบบใหม่ { owner, items }: เจ้าของเป็นบัญชีอื่น (ไม่ตรง user ปัจจุบัน และไม่ใช่ guest) → ล้างทิ้ง
 * - รูปแบบเก่า (array ล้วน ไม่มี owner): เชื่อ owner ไม่ได้ → ถ้าล็อกอินอยู่ให้ล้าง (กัน leak), guest เก็บได้
 * (login/logout ในแอปนี้ full-reload เสมอ → เช็คตอน mount ครอบทุกเส้นทาง)
 */
/** ตัดสินใจว่าตะกร้าที่ parse มาแล้วเป็นของ user ปัจจุบันไหม (pure — แยกจาก localStorage เพื่อเทสต์ได้) */
export function pickOwnedItems(parsed: unknown, currentEmail: string | null): CartItem[] {
  if (Array.isArray(parsed)) return currentEmail ? [] : sanitizeCart(parsed);   // legacy: เชื่อ owner ไม่ได้
  const p = parsed as { owner?: unknown; items?: unknown } | null;
  const owner = (p?.owner ?? null) as string | null;
  if (owner != null && owner !== currentEmail) return [];   // ตะกร้าของบัญชีอื่น
  return sanitizeCart(p?.items);
}

function loadOwnedCart(currentEmail: string | null): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return pickOwnedItems(JSON.parse(raw), currentEmail);
  } catch { return []; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const ownerRef = useRef<string | null>(null);   // เจ้าของตะกร้าปัจจุบัน (email หรือ null=guest)

  // โหลดจาก localStorage ครั้งแรก (เช็คเจ้าของ + sanitize เสมอ)
  useEffect(() => {
    // รอหลัง first paint เพื่อไม่ให้ hydration effect สร้าง cascading render
    const hydrate = window.setTimeout(() => {
      const email = currentUserEmail();
      ownerRef.current = email;
      setItems(loadOwnedCart(email));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, []);

  // บันทึกทุกครั้งที่เปลี่ยน (หลังโหลดเสร็จ) — ผูกเจ้าของไว้กับตะกร้า
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner: ownerRef.current, items }));
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
