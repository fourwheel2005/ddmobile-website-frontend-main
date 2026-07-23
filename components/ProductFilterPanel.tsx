"use client";
import { SlidersHorizontal, RotateCcw, BatteryFull, BatteryMedium, BatteryLow, BatteryWarning } from "lucide-react";
import type { Cond, Facets, ProductFilters, BatteryBand } from "@/lib/productSearch";
import { hasActiveFilters } from "@/lib/productSearch";

/**
 * แผงตัวกรองสินค้า — ปรับ facet ตามหมวด (มือ 1 / มือ 2 / อุปกรณ์เสริม) โดยอัตโนมัติ:
 *   - เกรด + สุขภาพแบตเตอรี่ แสดงเฉพาะมือ 2 (ของใหม่ไม่มีเกรด/แบตเต็มเสมอ)
 *   - facet ที่ไม่มีข้อมูลจริง (deriveFacets ว่าง) จะซ่อนเอง
 * (คำค้นหลักอยู่ช่องค้นหาด้านบนที่มี autocomplete — panel นี้โฟกัสตัวกรองแบบ facet)
 */
const BATTERY_BANDS: { key: BatteryBand; label: string; icon: typeof BatteryFull }[] = [
  { key: "all", label: "ทั้งหมด", icon: BatteryMedium },
  { key: "gte90", label: "90% ขึ้นไป", icon: BatteryFull },
  { key: "b80to89", label: "80% - 89%", icon: BatteryLow },
  { key: "lt80", label: "ต่ำกว่า 80%", icon: BatteryWarning },
];

export default function ProductFilterPanel({
  cond, facets, filters, onChange, onClear,
}: {
  cond: Cond;
  facets: Facets;
  filters: ProductFilters;
  onChange: (patch: Partial<ProductFilters>) => void;
  onClear: () => void;
}) {
  const isUsed = cond === "SECOND_HAND";
  const showGrade = isUsed && facets.grades.length > 0;
  const showStorage = facets.storages.length > 0;
  const showBattery = isUsed;   // มือ 2 เท่านั้น
  const modelLabel = cond === "ACCESSORY" ? "ชนิดสินค้า" : "รุ่น";

  const toggleStorage = (s: string) => {
    const has = filters.storages.includes(s);
    onChange({ storages: has ? filters.storages.filter((x) => x !== s) : [...filters.storages, s] });
  };

  return (
    <div className="rounded-2xl border border-border-default bg-white p-5 shadow-card">
      {/* หัวข้อ + ล้างค่า */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-text-heading">
          <SlidersHorizontal size={17} className="text-yellow-hover" /> ตัวกรองสินค้า
        </h2>
        {hasActiveFilters(filters) && (
          <button onClick={onClear} className="flex items-center gap-1 text-xs font-semibold text-yellow-text transition-colors hover:text-text-heading">
            <RotateCcw size={12} /> ล้างค่า
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* รุ่น / ชนิดสินค้า */}
        {facets.models.length > 0 && (
          <div>
            <label htmlFor="filter-model" className="mb-1.5 block text-sm font-semibold text-text-heading">{modelLabel}</label>
            <select id="filter-model" value={filters.model} onChange={(e) => onChange({ model: e.target.value })} className="input-dd cursor-pointer">
              <option value="">ทุก{modelLabel}</option>
              {facets.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {/* เกรด (มือ 2) */}
        {showGrade && (
          <div>
            <label htmlFor="filter-grade" className="mb-1.5 block text-sm font-semibold text-text-heading">เกรดสภาพ</label>
            <select id="filter-grade" value={filters.grade} onChange={(e) => onChange({ grade: e.target.value })} className="input-dd cursor-pointer">
              <option value="">ทั้งหมด</option>
              {facets.grades.map((g) => <option key={g} value={g}>เกรด {g}</option>)}
            </select>
          </div>
        )}

        {/* ความจุ (multi-select chips) */}
        {showStorage && (
          <div>
            <p className="mb-2 text-sm font-semibold text-text-heading">ความจุ</p>
            <div className="flex flex-wrap gap-2">
              {facets.storages.map((s) => {
                const active = filters.storages.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleStorage(s)}
                    className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                      active ? "border-yellow bg-yellow/15 text-text-heading ring-1 ring-yellow" : "border-border-default text-text-body hover:border-yellow hover:bg-bg-tinted"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* สุขภาพแบตเตอรี่ (มือ 2) */}
        {showBattery && (
          <div>
            <p className="mb-2 text-sm font-semibold text-text-heading">สุขภาพแบตเตอรี่</p>
            <div className="grid grid-cols-2 gap-2">
              {BATTERY_BANDS.map(({ key, label, icon: Icon }) => {
                const active = filters.battery === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ battery: key })}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "border-yellow bg-yellow/15 text-text-heading ring-1 ring-yellow" : "border-border-default text-text-body hover:border-yellow hover:bg-bg-tinted"
                    }`}
                  >
                    <Icon size={15} className="flex-shrink-0" /> {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* งบไม่เกิน */}
        <div>
          <label htmlFor="filter-price" className="mb-1.5 block text-sm font-semibold text-text-heading">งบไม่เกิน (บาท)</label>
          <input
            id="filter-price"
            type="number"
            inputMode="numeric"
            min={0}
            value={filters.maxPrice ?? ""}
            onChange={(e) => onChange({ maxPrice: e.target.value ? Math.max(0, Number(e.target.value)) : null })}
            placeholder="เช่น 20000"
            className="input-dd"
          />
        </div>
      </div>
    </div>
  );
}
