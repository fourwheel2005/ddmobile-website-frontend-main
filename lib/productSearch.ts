/**
 * Product search & faceted filter — ค้นหา/กรองสินค้าฝั่ง client (มือ 1 + มือ 2 + อุปกรณ์เสริม)
 *
 * ออกแบบเป็น pure functions ล้วน (ไม่มี I/O) เพื่อเทสต์ง่ายและ reuse ได้ทั้งหน้า list/หน้าแรก:
 *   - matchesFilters(): predicate ของ faceted filter (model/grade/storage/battery/price) — AND ข้าม facet, OR ใน facet
 *   - relevanceScore(): ให้คะแนนความเกี่ยวข้องของคำค้น (field-weighted + prefix bonus + typo-tolerant)
 *   - searchProducts(): orchestrator รวม filter + rank + sort (ของขายแล้วไปท้ายเสมอ)
 *   - deriveFacets(): ดึงตัวเลือก facet ที่ "มีจริงในข้อมูล" (auto-hide facet ที่ว่าง)
 *
 * ราคา/ส่วนลดจริงคิดที่ server เสมอ — ที่นี่ทำแค่ค้นหา/แสดงผล
 */

export type Cond = "NEW" | "SECOND_HAND" | "ACCESSORY";
export type BatteryBand = "all" | "gte90" | "b80to89" | "lt80";
export type SortKey = "recommended" | "price-asc" | "price-desc" | "newest" | "name";

/** รูปตัวเลือกรุ่นย่อย (variant) เท่าที่ search ต้องใช้ */
export interface OptionLike {
  storage: string | null;
  color?: string | null;
}

/** โครงข้อมูลขั้นต่ำที่ search ต้องใช้ (structural — CatalogItem เข้าได้เลย) */
export interface SearchableItem {
  id: string;
  type: string;                 // MODEL | UNIT | GROUP
  productName: string;
  brand: string;
  category: string;
  sku: string;
  color: string | null;
  storage: string | null;
  condition: string;            // NEW | SECOND_HAND
  grade?: string | null;
  avgBatteryHealth?: number | null;
  minPrice: number | null;
  latestReceivedAt?: string | null;
  options?: (OptionLike | null)[] | null;
  score?: number;
  sold?: boolean;
}

export interface ProductFilters {
  query: string;
  model: string;          // "" = ทุกรุ่น; else productName ตรงตัว
  grade: string;          // "" = ทุกเกรด (เฉพาะมือ 2)
  storages: string[];     // ว่าง = ทุกความจุ; else รายการ storage ที่เลือก (OR)
  battery: BatteryBand;   // เฉพาะมือ 2
  maxPrice: number | null;
}

/** ค่าเริ่มต้นของ facet (ไม่รวมคำค้น) — ใช้ตอนรีเซ็ตตัวกรอง/เปลี่ยนหมวด */
export const emptyFacet = (): Omit<ProductFilters, "query"> => ({
  model: "", grade: "", storages: [], battery: "all", maxPrice: null,
});
export const emptyFilters = (): ProductFilters => ({ query: "", ...emptyFacet() });

/* ============================ helpers ============================ */

/** normalize ข้อความสำหรับเทียบ: ตัวพิมพ์เล็ก + ตัดช่องว่างหัวท้าย + ยุบช่องว่างซ้ำ */
export function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** หมวดหลักของสินค้า: GROUP = อุปกรณ์เสริม · มือถือแยกมือ1/มือ2 ด้วย condition */
export function kindOf(it: { type: string; condition: string }): Cond {
  return it.type === "GROUP" ? "ACCESSORY" : (it.condition === "SECOND_HAND" ? "SECOND_HAND" : "NEW");
}

/** ความจุทั้งหมดของสินค้าหนึ่งชิ้น: MODEL ใช้จาก options, อื่น ๆ ใช้ storage ของตัวเอง */
export function itemStorages(it: SearchableItem): string[] {
  if (it.type === "MODEL" && it.options && it.options.length > 0) {
    return dedupe(it.options.map((o) => o?.storage).filter((s): s is string => !!s));
  }
  return it.storage ? [it.storage] : [];
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/** จัดเรียงความจุแบบตัวเลข (128 ก่อน 256) — รองรับ GB/TB */
function storageSortValue(s: string): number {
  const m = norm(s).match(/([\d.]+)\s*(tb|gb|mb)?/);
  if (!m) return Number.MAX_SAFE_INTEGER;   // ไม่รู้จัก → ท้ายสุด
  const n = parseFloat(m[1]);
  const unit = m[2];
  if (unit === "tb") return n * 1024;
  if (unit === "mb") return n / 1024;
  return n;   // ไม่มีหน่วย/gb = GB
}

/** Levenshtein แบบมีเพดาน — คืน true ถ้าระยะแก้ ≤ max (ใช้ทำ typo tolerance เบา ๆ) */
export function withinEditDistance(a: string, b: string, max: number): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > max) return false;
  // DP แถวเดียว
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;   // ทั้งแถวเกินเพดานแล้ว → หยุดเร็ว
    prev = cur;
  }
  return prev[lb] <= max;
}

/* ============================ relevance ============================ */

// ฟิลด์ที่ค้น + น้ำหนัก (ชื่อรุ่นสำคัญสุด)
interface Field { text: string; weight: number; }
function fieldsOf(it: SearchableItem): Field[] {
  const storages = itemStorages(it).join(" ");
  return [
    { text: norm(it.productName), weight: 4 },
    { text: norm(it.sku), weight: 2.5 },
    { text: norm(it.brand), weight: 2 },
    { text: norm(storages || it.storage), weight: 2 },
    { text: norm(it.color), weight: 1.5 },
    { text: norm(it.category), weight: 1 },
  ];
}

/**
 * คะแนนความเกี่ยวข้องของ item กับคำค้น
 * - 0 = ไม่ match (ทุก token ต้องเจอในฟิลด์ใดฟิลด์หนึ่ง = AND)
 * - แต่ละ token ได้คะแนน = น้ำหนักฟิลด์ที่ดีสุดที่เจอ + โบนัส prefix/exact/ตัวเลขความจุ
 * - typo tolerance: token ยาว ≥4 ที่ substring ไม่เจอ ลองเทียบ edit-distance ≤1 กับคำในชื่อรุ่น (คะแนนลด)
 */
export function relevanceScore(it: SearchableItem, query: string): number {
  const q = norm(query);
  if (!q) return 0;
  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  const fields = fieldsOf(it);
  const name = fields[0].text;
  let total = 0;

  for (const tok of tokens) {
    let best = 0;
    for (const f of fields) {
      if (!f.text) continue;
      if (f.text.includes(tok)) {
        let s = f.weight;
        // โบนัส: ขึ้นต้นด้วย token (prefix match ชัดกว่า substring กลางคำ)
        if (f === fields[0] && f.text.startsWith(tok)) s += 1.5;
        if (s > best) best = s;
      }
    }
    // ความจุแบบตัวเลขล้วน: "256" match "256gb"
    if (best === 0 && /^\d+$/.test(tok)) {
      for (const st of itemStorages(it)) {
        if (norm(st).replace(/\s/g, "").includes(tok)) { best = 2; break; }
      }
    }
    // typo tolerance: เทียบกับคำในชื่อรุ่น + ยี่ห้อ
    if (best === 0 && tok.length >= 4) {
      const words = `${name} ${fields[2].text}`.split(" ").filter(Boolean);
      if (words.some((w) => w.length >= 3 && withinEditDistance(tok, w, 1))) best = 2;
    }
    if (best === 0) return 0;   // token นี้ไม่เจอเลย → ทั้ง item ไม่ match (AND)
    total += best;
  }

  // โบนัสก้อน: ชื่อรุ่นตรงเป๊ะทั้งคำค้น
  if (name === q) total += 5;
  else if (name.startsWith(q)) total += 2;
  return total;
}

/* ============================ faceted filter ============================ */

/** predicate: item ผ่านตัวกรอง facet ทั้งหมดไหม (ไม่รวมคำค้น query) */
export function matchesFilters(it: SearchableItem, f: ProductFilters, cond: Cond): boolean {
  if (kindOf(it) !== cond) return false;

  if (f.model && norm(it.productName) !== norm(f.model)) return false;

  if (f.grade && norm(it.grade) !== norm(f.grade)) return false;

  if (f.storages.length > 0) {
    const mine = itemStorages(it).map(norm);
    const want = f.storages.map(norm);
    if (!mine.some((s) => want.includes(s))) return false;
  }

  if (f.battery !== "all") {
    const bh = it.avgBatteryHealth;
    if (bh == null) return false;                        // แบตไม่ทราบ → คัดออกเมื่อเลือกช่วง
    if (f.battery === "gte90" && !(bh >= 90)) return false;
    if (f.battery === "b80to89" && !(bh >= 80 && bh < 90)) return false;
    if (f.battery === "lt80" && !(bh < 80)) return false;
  }

  // ราคา: คัดออกเฉพาะเมื่อรู้ราคาและเกินงบ (ของที่ยังไม่ตั้งราคาให้คงไว้ = "สอบถามราคา")
  if (f.maxPrice != null && it.minPrice != null && it.minPrice > f.maxPrice) return false;

  return true;
}

/* ============================ orchestrator ============================ */

const soldLast = (a: SearchableItem, b: SearchableItem) => Number(!!a.sold) - Number(!!b.sold);

/**
 * รวม filter + rank + sort → ผลลัพธ์พร้อมแสดง
 * - มีคำค้น: คัด item ที่ไม่ match ทิ้ง แล้วเรียงตามความเกี่ยวข้อง (เว้นแต่ผู้ใช้เลือก sort ราคา/ชื่อ/ใหม่)
 * - ไม่มีคำค้น: เรียงตาม sortBy ปกติ (recommended = score จาก server)
 * - ของขายแล้วไปท้ายเสมอ (stable)
 */
export function searchProducts<T extends SearchableItem>(items: T[], f: ProductFilters, cond: Cond, sortBy: SortKey): T[] {
  const hasQuery = norm(f.query).length > 0;

  let arr = items.filter((it) => matchesFilters(it, f, cond));

  if (hasQuery) {
    const scored = arr
      .map((it) => ({ it, r: relevanceScore(it, f.query) }))
      .filter((x) => x.r > 0);
    // sort ราคา/ชื่อ/ใหม่ = เคารพผู้ใช้; ไม่งั้นเรียงตามความเกี่ยวข้อง (แล้ว score เป็น tiebreaker)
    if (sortBy === "recommended") {
      scored.sort((a, b) => b.r - a.r || (b.it.score ?? 0) - (a.it.score ?? 0));
    } else {
      scored.sort((a, b) => sortComparator(a.it, b.it, sortBy));
    }
    arr = scored.map((x) => x.it);
  } else {
    arr = [...arr].sort((a, b) => sortComparator(a, b, sortBy));
  }

  return arr.sort(soldLast);   // stable — ดันของขายแล้วไปท้ายโดยคงลำดับภายในกลุ่ม
}

function sortComparator(a: SearchableItem, b: SearchableItem, sortBy: SortKey): number {
  switch (sortBy) {
    case "price-asc": return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
    case "price-desc": return (b.minPrice ?? 0) - (a.minPrice ?? 0);
    case "newest": return (b.latestReceivedAt ?? "").localeCompare(a.latestReceivedAt ?? "");
    case "name": return a.productName.localeCompare(b.productName, "th");
    default: return (b.score ?? 0) - (a.score ?? 0);   // recommended
  }
}

/* ============================ facets ============================ */

export interface Facets {
  models: string[];
  grades: string[];
  storages: string[];
}

/** ดึงตัวเลือก facet ที่มีจริงในหมวดปัจจุบัน (เพื่อ render dropdown/chip + auto-hide ตัวที่ว่าง) */
export function deriveFacets(items: SearchableItem[], cond: Cond): Facets {
  const inCond = items.filter((it) => kindOf(it) === cond);
  const models = dedupe(inCond.map((it) => it.productName).filter(Boolean)).sort((a, b) => a.localeCompare(b, "th"));
  const grades = dedupe(inCond.map((it) => it.grade).filter((g): g is string => !!g)).sort();
  const storages = dedupe(inCond.flatMap(itemStorages)).sort((a, b) => storageSortValue(a) - storageSortValue(b));
  return { models, grades, storages };
}

/** มี facet ให้กรองจริงไหม (ใช้ตัดสินใจแสดง/ซ่อนทั้ง panel ต่อหมวด) */
export function hasActiveFilters(f: ProductFilters): boolean {
  return !!(f.query.trim() || f.model || f.grade || f.storages.length || f.battery !== "all" || f.maxPrice != null);
}
