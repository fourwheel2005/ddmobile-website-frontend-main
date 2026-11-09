import { describe, it, expect } from "vitest";
import { clipsForItem, clipStateLabel, resolveClipProduct, type ClipCatalogItem, type ClipProduct, type ProductClip } from "./productClips";
import { formatDuration, targetSize, videoBitrate } from "./videoCompress";

const unit = (over: Partial<ClipCatalogItem> = {}): ClipCatalogItem => ({
  id: "u-536", type: "UNIT", productName: "iPhone 14 Pro", condition: "SECOND_HAND", conditionLabel: "มือ 2",
  color: "Deep Purple", storage: "256GB", sku: "DD00536", minPrice: 17900, imageUrl: "https://img/536.jpg", sold: false, stockState: "AVAILABLE",
  ...over,
});
const link = (over: Partial<ClipProduct> = {}): ClipProduct => ({
  catalogId: "u-536", variantId: null, productName: "iPhone 14 Pro", color: "Deep Purple", storage: "256GB", conditionLabel: "มือ 2", sku: "DD00536",
  ...over,
});
const clip = (id: number, products: ClipProduct[]): ProductClip => ({
  id, title: null, videoUrl: `v${id}.mp4`, posterUrl: `p${id}.jpg`, width: 720, height: 1280, durationMs: 30000, sizeBytes: 1, products, visible: true, sortOrder: id,
});

describe("resolveClipProduct — ราคา/สถานะสดจาก catalog", () => {
  it("เครื่องยังอยู่ → ราคาปัจจุบัน + ลิงก์หน้าเครื่อง", () => {
    const r = resolveClipProduct(link(), [unit({ minPrice: 16900 })]);
    expect(r).toMatchObject({ state: "available", price: 16900, href: "/products/u-536", spec: "Deep Purple · 256GB · มือ 2" });
  });
  it("มีคนจอง/วางมัดจำ → ยังลิงก์เครื่องนี้ พร้อมป้าย", () => {
    expect(resolveClipProduct(link(), [unit({ stockState: "DEPOSITED" })]).state).toBe("reserved");
    expect(clipStateLabel("reserved")).toBe("มีคนจองแล้ว");
  });
  it("ขายแล้ว → รุ่นเดียวกันที่ยังมีของ: ความจุ/สีตรงก่อน แล้วถูกสุด · ไม่เอาเครื่องที่ถูกจอง/มือคนละแบบ", () => {
    const catalog = [
      unit({ sold: true }),
      unit({ id: "a", storage: "128GB", color: "Deep Purple", minPrice: 15900 }),
      unit({ id: "b", storage: "256GB", color: "Gold", minPrice: 18900 }),
      unit({ id: "c", storage: "256GB", color: "Deep Purple", minPrice: 19900, stockState: "RESERVED" }),
      unit({ id: "d", type: "MODEL", condition: "NEW", storage: "256GB", color: "Deep Purple", minPrice: 30000 }),
    ];
    expect(resolveClipProduct(link(), catalog)).toMatchObject({ state: "similar", href: "/products/b", price: 18900 });
  });
  it("เครื่องหายจากคลังและไม่เหลือรุ่นนี้ → หน้ารวมมือ 2 ไม่โชว์ราคา", () => {
    expect(resolveClipProduct(link(), [])).toMatchObject({ state: "gone", price: null, href: "/products?condition=SECOND_HAND" });
  });
  it("มือ 1 เลือกสี/ความจุ → ราคา+รูปของตัวเลือกนั้น · ลิงก์ ?variant= · ตัวเลือกหมด = out", () => {
    const model = unit({
      id: "m17", type: "MODEL", productName: "iPhone 17", condition: "NEW", conditionLabel: "มือ 1", color: null, storage: null, minPrice: 29900,
      options: [
        { variantId: "v1", color: "Lavender", storage: "256GB", price: 29900, quantity: 2, imageUrl: "lav.jpg" },
        { variantId: "v2", color: "Mist Blue", storage: "512GB", price: 37900, quantity: 0, imageUrl: null },
      ],
    });
    expect(resolveClipProduct(link({ catalogId: "m17", variantId: "v1", productName: "iPhone 17" }), [model]))
      .toMatchObject({ state: "available", price: 29900, imageUrl: "lav.jpg", href: "/products/m17?variant=v1", spec: "Lavender · 256GB · มือ 1" });
    expect(resolveClipProduct(link({ catalogId: "m17", variantId: "v2", productName: "iPhone 17" }), [model]))
      .toMatchObject({ state: "out", price: 37900, imageUrl: "https://img/536.jpg" });
  });
});

describe("clipsForItem — คลิปในหน้าสินค้า", () => {
  it("ผูกเครื่องนี้ตรง ๆ ก่อน → รุ่นเดียวกันมือเดียวกัน · ไม่ปนรุ่น/มืออื่น", () => {
    const clips = [
      clip(1, [link({ catalogId: "other", productName: "iPhone 14 Pro" })]),
      clip(2, [link({ catalogId: "x", productName: "iPhone 14 Pro Max" })]),
      clip(3, [link()]),
      clip(4, [link({ catalogId: "m", productName: "iPhone 14 Pro", conditionLabel: "มือ 1" })]),
    ];
    expect(clipsForItem(clips, unit()).map((c) => c.id)).toEqual([3, 1]);
  });
});

describe("videoCompress helpers", () => {
  it("ขนาด: iPhone แนวตั้ง 1080×1920 → 720×1280 · 4K แนวนอน → 1280×720 · คลิปเล็กไม่ขยาย · เลขคู่เสมอ", () => {
    expect(targetSize(1080, 1920)).toEqual({ width: 720, height: 1280 });
    expect(targetSize(3840, 2160)).toEqual({ width: 1280, height: 720 });
    expect(targetSize(480, 854)).toEqual({ width: 480, height: 854 });
    expect(targetSize(886, 1920)).toEqual({ width: 590, height: 1280 });
    expect(targetSize(1081, 1081)).toEqual({ width: 720, height: 720 });
  });
  it("bitrate: คลิปสั้นได้ 2.5Mbps · 2 นาทีไฟล์ยังไม่เกิน ~22MB", () => {
    expect(videoBitrate(20)).toBe(2_500_000);
    const b = videoBitrate(120);
    expect(b).toBeLessThan(1_500_000);
    expect(((b + 96_000) * 120) / 8 / 1024 / 1024).toBeLessThanOrEqual(22);
  });
  it("formatDuration", () => {
    expect(formatDuration(75_500)).toBe("1:16");
    expect(formatDuration(9_000)).toBe("0:09");
  });
});
