import { describe, it, expect } from "vitest";
import {
  norm, kindOf, itemStorages, withinEditDistance,
  relevanceScore, matchesFilters, searchProducts, deriveFacets,
  emptyFilters, hasActiveFilters,
  type SearchableItem, type ProductFilters,
} from "./productSearch";

/* ---------- test data builder: ระบุเฉพาะ field ที่เกี่ยว, ที่เหลือ default valid ---------- */
function make(over: Partial<SearchableItem> = {}): SearchableItem {
  return {
    id: over.id ?? "id-" + Math.round(Math.abs(Math.sin((over.productName ?? "x").length)) * 1e6),
    type: "UNIT",
    productName: "iPhone 13",
    brand: "Apple",
    category: "iPhone",
    sku: "SKU-1",
    color: "Black",
    storage: "128GB",
    condition: "SECOND_HAND",
    grade: null,
    avgBatteryHealth: null,
    minPrice: 10000,
    latestReceivedAt: "2026-01-01",
    options: null,
    score: 0,
    sold: false,
    ...over,
  };
}
const withFilters = (o: Partial<ProductFilters> = {}): ProductFilters => ({ ...emptyFilters(), ...o });

describe("norm", () => {
  it("ลดตัวพิมพ์ + ยุบช่องว่าง + ตัดหัวท้าย", () => {
    expect(norm("  iPhone   15  PRO ")).toBe("iphone 15 pro");
  });
  it("null/undefined → สตริงว่าง", () => {
    expect(norm(null)).toBe("");
    expect(norm(undefined)).toBe("");
  });
});

describe("kindOf", () => {
  it("GROUP = อุปกรณ์เสริมเสมอ แม้ condition NEW", () => {
    expect(kindOf({ type: "GROUP", condition: "NEW" })).toBe("ACCESSORY");
  });
  it("MODEL/NEW = มือ 1, UNIT/SECOND_HAND = มือ 2", () => {
    expect(kindOf({ type: "MODEL", condition: "NEW" })).toBe("NEW");
    expect(kindOf({ type: "UNIT", condition: "SECOND_HAND" })).toBe("SECOND_HAND");
  });
});

describe("itemStorages", () => {
  it("MODEL ดึงจาก options + dedupe", () => {
    const it = make({ type: "MODEL", storage: null, options: [{ storage: "128GB" }, { storage: "256GB" }, { storage: "128GB" }, null] });
    expect(itemStorages(it).sort()).toEqual(["128GB", "256GB"]);
  });
  it("UNIT ใช้ storage ของตัวเอง; ไม่มี storage → []", () => {
    expect(itemStorages(make({ storage: "512GB" }))).toEqual(["512GB"]);
    expect(itemStorages(make({ storage: null }))).toEqual([]);
  });
});

describe("withinEditDistance", () => {
  it("เท่ากันหรือระยะ ≤ max = true", () => {
    expect(withinEditDistance("iphone", "iphone", 1)).toBe(true);
    expect(withinEditDistance("iphon", "iphone", 1)).toBe(true);   // เพิ่ม 1
    expect(withinEditDistance("ipone", "iphone", 1)).toBe(true);   // สลับ/ขาด 1
  });
  it("ระยะเกิน max หรือความยาวต่างเกิน = false", () => {
    expect(withinEditDistance("ipod", "iphone", 1)).toBe(false);
    expect(withinEditDistance("abc", "iphone", 1)).toBe(false);
  });
});

describe("relevanceScore", () => {
  it("คำค้นว่าง → 0", () => {
    expect(relevanceScore(make(), "")).toBe(0);
    expect(relevanceScore(make(), "   ")).toBe(0);
  });
  it("ทุก token ต้องเจอ (AND) — token เดียวหลุด = 0", () => {
    const it = make({ productName: "iPhone 15 Pro" });
    expect(relevanceScore(it, "iphone pro")).toBeGreaterThan(0);
    expect(relevanceScore(it, "iphone samsung")).toBe(0);   // samsung ไม่มี → หลุด
  });
  it("ความจุตัวเลขล้วน match กับ storage ที่มีหน่วย", () => {
    const it = make({ productName: "iPhone 13", storage: "256GB" });
    expect(relevanceScore(it, "256")).toBeGreaterThan(0);
  });
  it("typo tolerance: สะกดผิด 1 ตัวยังเจอ", () => {
    const it = make({ productName: "iPhone 15" });
    expect(relevanceScore(it, "iphon")).toBeGreaterThan(0);   // ขาด e
  });
  it("ชื่อรุ่นตรงเป๊ะ/prefix ได้คะแนนสูงกว่า match กลางคำ", () => {
    const exact = make({ productName: "iPhone 15" });
    const mid = make({ productName: "Apple iPhone 15 Pro Max Special" });
    expect(relevanceScore(exact, "iphone 15")).toBeGreaterThan(relevanceScore(mid, "iphone 15"));
  });
  it("ไม่ match เลย → 0", () => {
    expect(relevanceScore(make({ productName: "iPhone 13" }), "galaxy")).toBe(0);
  });
});

describe("matchesFilters", () => {
  it("คนละหมวด → false", () => {
    expect(matchesFilters(make({ type: "UNIT", condition: "SECOND_HAND" }), emptyFilters(), "NEW")).toBe(false);
  });
  it("model filter: ตรงชื่อรุ่นเท่านั้น", () => {
    const it = make({ productName: "iPhone 13" });
    expect(matchesFilters(it, withFilters({ model: "iPhone 13" }), "SECOND_HAND")).toBe(true);
    expect(matchesFilters(it, withFilters({ model: "iPhone 14" }), "SECOND_HAND")).toBe(false);
  });
  it("grade filter (มือ 2)", () => {
    const a = make({ grade: "A" });
    expect(matchesFilters(a, withFilters({ grade: "A" }), "SECOND_HAND")).toBe(true);
    expect(matchesFilters(a, withFilters({ grade: "B" }), "SECOND_HAND")).toBe(false);
  });
  it("storages OR: match ถ้าความจุตรงตัวใดตัวหนึ่งที่เลือก", () => {
    const it = make({ storage: "256GB" });
    expect(matchesFilters(it, withFilters({ storages: ["128GB", "256GB"] }), "SECOND_HAND")).toBe(true);
    expect(matchesFilters(it, withFilters({ storages: ["128GB", "512GB"] }), "SECOND_HAND")).toBe(false);
  });
  it("battery bands + แบตไม่ทราบถูกคัดออกเมื่อเลือกช่วง", () => {
    expect(matchesFilters(make({ avgBatteryHealth: 95 }), withFilters({ battery: "gte90" }), "SECOND_HAND")).toBe(true);
    expect(matchesFilters(make({ avgBatteryHealth: 85 }), withFilters({ battery: "b80to89" }), "SECOND_HAND")).toBe(true);
    expect(matchesFilters(make({ avgBatteryHealth: 90 }), withFilters({ battery: "b80to89" }), "SECOND_HAND")).toBe(false); // ขอบบน exclusive
    expect(matchesFilters(make({ avgBatteryHealth: 79 }), withFilters({ battery: "lt80" }), "SECOND_HAND")).toBe(true);
    expect(matchesFilters(make({ avgBatteryHealth: null }), withFilters({ battery: "gte90" }), "SECOND_HAND")).toBe(false);
    expect(matchesFilters(make({ avgBatteryHealth: null }), withFilters({ battery: "all" }), "SECOND_HAND")).toBe(true);
  });
  it("maxPrice: คัดออกเมื่อเกินงบ, คงของราคา null (สอบถามราคา)", () => {
    expect(matchesFilters(make({ minPrice: 20000 }), withFilters({ maxPrice: 15000 }), "SECOND_HAND")).toBe(false);
    expect(matchesFilters(make({ minPrice: 12000 }), withFilters({ maxPrice: 15000 }), "SECOND_HAND")).toBe(true);
    expect(matchesFilters(make({ minPrice: null }), withFilters({ maxPrice: 15000 }), "SECOND_HAND")).toBe(true);
  });
});

describe("searchProducts", () => {
  const items = [
    make({ id: "a", productName: "iPhone 13", storage: "128GB", minPrice: 12000, score: 5 }),
    make({ id: "b", productName: "iPhone 15 Pro", storage: "256GB", minPrice: 30000, score: 9 }),
    make({ id: "c", productName: "iPhone 15 Pro Max", storage: "512GB", minPrice: 40000, score: 8, sold: true }),
    make({ id: "d", productName: "Samsung Galaxy S24", brand: "Samsung", category: "Samsung", storage: "256GB", minPrice: 25000, score: 7 }),
  ];

  it("ค้น 'iphone 15' → คืนเฉพาะ iPhone 15 เรียงตามความเกี่ยวข้อง (ขายแล้วท้าย)", () => {
    const r = searchProducts(items, withFilters({ query: "iphone 15" }), "SECOND_HAND", "recommended");
    expect(r.map((x) => x.id)).toEqual(["b", "c"]);   // c ขายแล้ว → ท้าย
  });
  it("ไม่มีคำค้น → เรียงตาม sortBy (ราคาน้อย→มาก) + ขายแล้วท้าย", () => {
    const r = searchProducts(items, emptyFilters(), "SECOND_HAND", "price-asc");
    expect(r.map((x) => x.id)).toEqual(["a", "d", "b", "c"]);
  });
  it("มีคำค้นแต่เลือก sort ราคา → เคารพ sort ราคา ไม่ใช่ relevance", () => {
    const r = searchProducts(items, withFilters({ query: "iphone" }), "SECOND_HAND", "price-desc");
    expect(r.map((x) => x.id)).toEqual(["b", "a", "c"]);   // b(30k) > a(12k) > c(sold ท้าย)
  });
  it("กรอง storage + query ทำงานร่วมกัน", () => {
    const r = searchProducts(items, withFilters({ query: "iphone", storages: ["256GB"] }), "SECOND_HAND", "recommended");
    expect(r.map((x) => x.id)).toEqual(["b"]);
  });
  it("n=0: ไม่มี item ในหมวด → []", () => {
    expect(searchProducts([], emptyFilters(), "NEW", "recommended")).toEqual([]);
  });
});

describe("deriveFacets", () => {
  const items = [
    make({ type: "UNIT", condition: "SECOND_HAND", productName: "iPhone 13", storage: "128GB", grade: "A" }),
    make({ type: "UNIT", condition: "SECOND_HAND", productName: "iPhone 13", storage: "256GB", grade: "B" }),
    make({ type: "MODEL", condition: "NEW", productName: "iPhone 15", storage: null, options: [{ storage: "256GB" }, { storage: "512GB" }] }),
  ];
  it("มือ 2: models/grades/storages distinct + เรียงความจุแบบตัวเลข", () => {
    const f = deriveFacets(items, "SECOND_HAND");
    expect(f.models).toEqual(["iPhone 13"]);
    expect(f.grades).toEqual(["A", "B"]);
    expect(f.storages).toEqual(["128GB", "256GB"]);   // 128 ก่อน 256
  });
  it("มือ 1: grade ว่าง (ของใหม่ไม่มีเกรด), storages จาก options", () => {
    const f = deriveFacets(items, "NEW");
    expect(f.grades).toEqual([]);
    expect(f.storages).toEqual(["256GB", "512GB"]);
  });
});

describe("hasActiveFilters", () => {
  it("ค่าเริ่มต้น = ไม่มีตัวกรอง; ตั้งค่าใด ๆ = มี", () => {
    expect(hasActiveFilters(emptyFilters())).toBe(false);
    expect(hasActiveFilters(withFilters({ storages: ["128GB"] }))).toBe(true);
    expect(hasActiveFilters(withFilters({ battery: "gte90" }))).toBe(true);
    expect(hasActiveFilters(withFilters({ query: "x" }))).toBe(true);
  });
});
