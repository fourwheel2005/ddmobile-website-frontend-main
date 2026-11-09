/**
 * คลิปสินค้า (shoppable video) — ชนิดข้อมูล + จับคู่สินค้าที่ผูกกับ catalog สด
 *
 * คลิปเก็บ "snapshot" สินค้าตอนแอดมินเลือก (ชื่อ/สี/ความจุ/รหัส) แต่ราคา/สถานะดึงสดจาก /catalog ทุกครั้ง:
 *   - ยังมีของ → ราคาปัจจุบัน + ลิงก์หน้าเครื่อง
 *   - มือ 2 ขายแล้ว (เครื่องหายจากคลัง/ติดป้ายขายแล้ว) → ชี้ไปรุ่นเดียวกันที่ยังมีของแทน (คลิปไม่พาไปทางตัน)
 *   - ไม่เหลือรุ่นนี้เลย → ลิงก์หน้ารวมสินค้า ไม่โชว์ราคา
 */
import api from "@/lib/api";
import { norm, kindOf, type Cond } from "@/lib/productSearch";

export interface ClipProduct {
  catalogId: string | null;
  variantId: string | null;
  productName: string;
  color: string | null;
  storage: string | null;
  conditionLabel: string | null;
  sku: string | null;
}

export interface ProductClip {
  id: number;
  title: string | null;
  videoUrl: string;
  posterUrl: string;
  width: number;
  height: number;
  durationMs: number;
  sizeBytes: number;
  products: ClipProduct[];
  visible: boolean;
  sortOrder: number;
}

/** field ของ catalog ที่ต้องใช้ (structural — CatalogItem ของหน้าเว็บเข้าได้เลย) */
export interface ClipCatalogItem {
  id: string;
  type: string;
  productName: string;
  condition: string;
  conditionLabel?: string | null;
  color: string | null;
  storage: string | null;
  sku?: string | null;
  minPrice: number | null;
  imageUrl: string | null;
  sold?: boolean;
  stockState?: string | null;
  options?: { variantId: string; color: string | null; storage: string | null; price: number | null; quantity: number; imageUrl: string | null }[] | null;
}

export type ClipProductState = "available" | "reserved" | "out" | "similar" | "gone";

export interface ResolvedClipProduct {
  key: string;
  name: string;
  spec: string;
  imageUrl: string | null;
  price: number | null;
  href: string;
  state: ClipProductState;
}

const reserved = (s?: string | null) => s === "RESERVED" || s === "DEPOSITED";
const condOfLabel = (label?: string | null): Cond => (/2|สอง/.test(label ?? "") ? "SECOND_HAND" : "NEW");
const specOf = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");
const detailHref = (id: string, variantId?: string | null) =>
  `/products/${encodeURIComponent(id)}${variantId ? `?variant=${encodeURIComponent(variantId)}` : ""}`;

/** สินค้า 1 ชิ้นที่ผูกกับคลิป → ราคา/สถานะ/ลิงก์ปัจจุบัน */
export function resolveClipProduct(p: ClipProduct, catalog: ClipCatalogItem[]): ResolvedClipProduct {
  const key = `${p.catalogId ?? ""}|${p.variantId ?? ""}|${p.productName}`;
  const exact = p.catalogId ? catalog.find((i) => i.id === p.catalogId) : undefined;

  if (exact && !exact.sold) {
    const opt = p.variantId ? exact.options?.find((o) => o.variantId === p.variantId) : undefined;
    if (opt) {
      return {
        key, name: exact.productName, spec: specOf(opt.color, opt.storage, exact.conditionLabel),
        imageUrl: opt.imageUrl ?? exact.imageUrl, price: opt.price ?? exact.minPrice,
        href: detailHref(exact.id, opt.variantId), state: opt.quantity > 0 ? "available" : "out",
      };
    }
    return {
      key, name: exact.productName, spec: specOf(exact.color ?? p.color, exact.storage ?? p.storage, exact.conditionLabel),
      imageUrl: exact.imageUrl, price: exact.minPrice, href: detailHref(exact.id),
      state: reserved(exact.stockState) ? "reserved" : "available",
    };
  }

  // เครื่องนี้ขายแล้ว/หายจากคลัง → รุ่นเดียวกัน (มือเดียวกัน) ที่ยังซื้อได้ · ความจุ/สีเดียวกันก่อน แล้วถูกสุด
  const cond = exact ? kindOf(exact) : condOfLabel(p.conditionLabel);
  const name = norm(p.productName);
  const alts = catalog.filter((i) => !i.sold && !reserved(i.stockState) && kindOf(i) === cond && norm(i.productName) === name);
  if (alts.length > 0) {
    const score = (i: ClipCatalogItem) =>
      (p.storage && norm(i.storage) === norm(p.storage) ? 2 : 0) + (p.color && norm(i.color) === norm(p.color) ? 1 : 0);
    const best = [...alts].sort((a, b) => score(b) - score(a) || (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity))[0];
    return {
      key, name: best.productName, spec: specOf(best.color, best.storage, best.conditionLabel),
      imageUrl: best.imageUrl, price: best.minPrice, href: detailHref(best.id), state: "similar",
    };
  }
  return {
    key, name: p.productName, spec: specOf(p.color, p.storage, p.conditionLabel),
    imageUrl: exact?.imageUrl ?? null, price: null, href: `/products?condition=${cond}`, state: "gone",
  };
}

/** คลิปที่เกี่ยวกับสินค้าหน้านี้: ผูกเครื่องนี้ตรง ๆ ก่อน แล้วตามด้วยคลิปของรุ่นเดียวกัน (มือเดียวกัน) */
export function clipsForItem(clips: ProductClip[], item: Pick<ClipCatalogItem, "id" | "type" | "productName" | "condition">): ProductClip[] {
  const name = norm(item.productName), cond = kindOf(item);
  const direct = (c: ProductClip) => c.products.some((p) => p.catalogId === item.id);
  const sameModel = (c: ProductClip) => c.products.some((p) => norm(p.productName) === name && condOfLabel(p.conditionLabel) === cond);
  return [...clips.filter(direct), ...clips.filter((c) => !direct(c) && sameModel(c))];
}

/** ข้อความป้ายสถานะบนการ์ดสินค้าในคลิป (null = ไม่ต้องมีป้าย) */
export function clipStateLabel(s: ClipProductState): string | null {
  switch (s) {
    case "reserved": return "มีคนจองแล้ว";
    case "out": return "สินค้าหมด";
    case "similar": return "รุ่นเดียวกันที่ยังมีของ";
    case "gone": return "ขายแล้ว";
    default: return null;
  }
}

const CLIPS_TTL_MS = 60_000;
let clipsCache: { at: number; data: ProductClip[] } | null = null;
let clipsInFlight: Promise<ProductClip[]> | null = null;

/** คลิปที่เปิดแสดง (หน้าแรก + หน้าสินค้าใช้ร่วม) — แคชในหน้า 1 นาที · โหลดไม่ได้ = [] (ส่วนคลิปซ่อนเอง ไม่ทำหน้าพัง) */
export function loadPublicClips(): Promise<ProductClip[]> {
  if (clipsCache && Date.now() - clipsCache.at < CLIPS_TTL_MS) return Promise.resolve(clipsCache.data);
  clipsInFlight ??= api.get<ProductClip[]>("/product-clips")
    .then((r) => {
      const data = Array.isArray(r.data) ? r.data : [];
      clipsCache = { at: Date.now(), data };
      return data;
    })
    .catch(() => [] as ProductClip[])
    .finally(() => { clipsInFlight = null; });
  return clipsInFlight;
}
