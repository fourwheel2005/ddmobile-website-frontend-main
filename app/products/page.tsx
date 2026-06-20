"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import api from "@/lib/api";
import { Search, Smartphone, CheckCircle2, ArrowUpDown, X, BatteryMedium, Sparkles, RotateCcw } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ProductGridSkeleton } from "@/components/Skeletons";

interface CatalogItem {
  id: string;
  variantId: string;
  productName: string;
  brand: string;
  sku: string;
  color: string | null;
  storage: string | null;
  condition: string;        // NEW | SECOND_HAND
  conditionLabel: string;   // มือ 1 | มือ 2
  quantity: number;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl: string | null;
  latestReceivedAt: string | null;
  avgBatteryHealth: number | null;
  score: number;
}

type SortKey = "recommended" | "price-asc" | "price-desc" | "newest" | "name";
type Cond = "all" | "NEW" | "SECOND_HAND";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "แนะนำ" },
  { key: "price-asc", label: "ราคาน้อย → มาก" },
  { key: "price-desc", label: "ราคามาก → น้อย" },
  { key: "newest", label: "มาใหม่ล่าสุด" },
  { key: "name", label: "ชื่อ ก-ฮ / A-Z" },
];

const money = (v: number | null) => (v == null ? "-" : "฿" + Number(v).toLocaleString());

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (<>{text.slice(0, i)}<mark className="rounded bg-yellow/50 px-0.5 text-text-heading">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>);
}

export default function ProductsPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const [cond, setCond] = useState<Cond>("all");
  const [brand, setBrand] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [showSuggest, setShowSuggest] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const res = await api.get("/catalog");
        setItems(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Catalog error:", e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // หมวดหมู่ยี่ห้อ (จาก catalog ทั้งหมด) + จำนวน
  const brands = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((it) => m.set(it.brand, (m.get(it.brand) || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const condCounts = useMemo(() => ({
    all: items.length,
    NEW: items.filter((i) => i.condition === "NEW").length,
    SECOND_HAND: items.filter((i) => i.condition === "SECOND_HAND").length,
  }), [items]);

  // กรอง + เรียง (client-side, instant)
  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const max = maxPrice ? Number(maxPrice) : null;
    let arr = items.filter((it) => {
      if (cond !== "all" && it.condition !== cond) return false;
      if (brand !== "all" && it.brand !== brand) return false;
      if (max != null && it.minPrice != null && it.minPrice > max) return false;
      if (q) {
        const hay = `${it.productName} ${it.sku} ${it.color ?? ""} ${it.storage ?? ""} ${it.brand}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    switch (sortBy) {
      case "price-asc": arr.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity)); break;
      case "price-desc": arr.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0)); break;
      case "newest": arr.sort((a, b) => (b.latestReceivedAt ?? "").localeCompare(a.latestReceivedAt ?? "")); break;
      case "name": arr.sort((a, b) => a.productName.localeCompare(b.productName, "th")); break;
      default: arr.sort((a, b) => b.score - a.score); // recommended
    }
    return arr;
  }, [items, search, sortBy, cond, brand, maxPrice]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return items.filter((it) => it.productName.toLowerCase().includes(q)).slice(0, 6);
  }, [items, search]);

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">

        {/* Header + Search */}
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="section-label">พร้อมขาย · อัปเดตเรียลไทม์จากคลัง</p>
            <h1 className="text-2xl font-bold text-text-heading md:text-4xl">มือถือทั้งหมด</h1>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="ค้นหารุ่น / สี / ความจุ / ยี่ห้อ..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => { blurTimer.current = setTimeout(() => setShowSuggest(false), 150); }}
              aria-label="ค้นหาสินค้า"
              className="input-dd pl-11 pr-9"
            />
            {search && (
              <button onClick={() => { setSearch(""); setShowSuggest(false); }} aria-label="ล้างคำค้นหา" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-text-muted hover:text-text-heading">
                <X size={16} />
              </button>
            )}
            {showSuggest && suggestions.length > 0 && (
              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border-default bg-white shadow-[var(--shadow-hover)]" onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}>
                {suggestions.map((s) => (
                  <Link key={s.id} href={`/products/${encodeURIComponent(s.id)}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-bg-subtle">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle">
                      {s.imageUrl ? <img src={s.imageUrl} alt={s.productName} className="h-full w-full object-contain p-1" /> : <Smartphone size={18} className="text-text-disabled" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-heading"><Highlight text={s.productName} query={search} /></p>
                      <p className="text-xs text-text-muted">{s.conditionLabel}{s.storage ? ` · ${s.storage}` : ""}</p>
                    </div>
                    <span className="flex-shrink-0 text-sm font-bold text-price">{money(s.minPrice)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Condition tabs (หมวดสภาพ) */}
        <div className="mb-4 flex gap-2">
          {([["all", "ทั้งหมด"], ["NEW", "มือ 1 (ใหม่)"], ["SECOND_HAND", "มือ 2 (มือสอง)"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setCond(k)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${cond === k ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`}
            >
              {label} <span className="opacity-60">({condCounts[k]})</span>
            </button>
          ))}
        </div>

        {/* Brand chips (หมวดยี่ห้อ) */}
        {brands.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => setBrand("all")} className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${brand === "all" ? "border-yellow bg-yellow text-text-heading" : "border-border-default bg-white text-text-body hover:border-yellow"}`}>
              ทุกยี่ห้อ
            </button>
            {brands.map(([b, n]) => (
              <button key={b} onClick={() => setBrand(b)} className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${brand === b ? "border-yellow bg-yellow text-text-heading" : "border-border-default bg-white text-text-body hover:border-yellow"}`}>
                {b} <span className="opacity-60">({n})</span>
              </button>
            ))}
          </div>
        )}

        {/* Sort + price + count */}
        <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-border-default pb-5">
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} aria-label="เรียงลำดับ" className="input-dd min-h-0 w-auto cursor-pointer py-2 pl-9 pr-8 text-sm">
              {sortOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <span>งบไม่เกิน</span>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="฿ ราคา" aria-label="ราคาไม่เกิน" className="input-dd min-h-0 w-28 py-2 text-sm" />
          </div>
          {!isLoading && <span className="ml-auto text-sm text-text-muted">พบ {displayed.length} รายการ</span>}
        </div>

        {/* Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-24 text-center">
            <Smartphone size={44} className="mx-auto mb-3 text-text-disabled" />
            <h3 className="text-lg font-bold text-text-heading">โหลดสินค้าไม่สำเร็จ</h3>
            <p className="mt-1 text-sm text-text-muted">กรุณาลองใหม่อีกครั้งภายหลัง</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-24 text-center">
            <Smartphone size={44} className="mx-auto mb-3 text-text-disabled" />
            <h3 className="text-lg font-bold text-text-heading">ไม่พบสินค้าที่ตรงเงื่อนไข</h3>
            <p className="mt-1 text-sm text-text-muted">ลองเปลี่ยนคำค้นหา ยี่ห้อ หรือเงื่อนไขสภาพเครื่อง</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {displayed.map((it) => (
                <motion.div key={it.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.25 }}>
                  <Link href={`/products/${encodeURIComponent(it.id)}`} className="card-dd group flex h-full flex-col overflow-hidden !p-0">
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-bg-subtle p-4">
                      <span className={`badge-dd absolute left-3 top-3 z-10 ${it.condition === "NEW" ? "badge-success" : "badge-info"}`}>
                        {it.condition === "NEW" ? <Sparkles size={11} /> : <RotateCcw size={11} />} {it.conditionLabel}
                      </span>
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt={it.productName} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <Smartphone size={52} className="text-text-disabled" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 text-sm font-semibold text-text-heading group-hover:text-yellow-hover">{it.productName}</h3>
                      <p className="mt-1 line-clamp-1 text-xs text-text-muted">
                        {[it.color, it.storage].filter(Boolean).join(" · ") || it.brand}
                        {it.avgBatteryHealth != null && <span className="ml-1 inline-flex items-center gap-0.5"><BatteryMedium size={11} /> {it.avgBatteryHealth}%</span>}
                      </p>
                      <div className="mt-auto pt-3">
                        <p className="text-xs text-text-muted">ราคา</p>
                        <p className="mb-2 text-lg font-bold text-price">{money(it.minPrice)}{it.maxPrice != null && it.maxPrice !== it.minPrice ? ` - ${Number(it.maxPrice).toLocaleString()}` : ""}</p>
                        {it.quantity > 0 ? (
                          <span className="badge-dd badge-success"><CheckCircle2 size={12} /> พร้อมส่ง {it.quantity} เครื่อง</span>
                        ) : (
                          <span className="badge-dd badge-error">หมดชั่วคราว</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
