"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2, CheckCircle2, Pencil } from "lucide-react";
import type { ThaiAddress } from "thai-address-database";

/** ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ ที่ลูกค้าเลือก */
export interface ThaiGeo {
  subdistrict: string;   // ตำบล/แขวง
  district: string;      // อำเภอ/เขต
  province: string;      // จังหวัด
  zipcode: string;
}

// lazy-load ฐานข้อมูลที่อยู่ (2 MB) เฉพาะตอนใช้จริง — โหลดครั้งเดียวต่อ session
type DB = typeof import("thai-address-database");
let dbPromise: Promise<DB> | null = null;
const loadDB = () => (dbPromise ??= import("thai-address-database"));

/**
 * ช่องค้นหาที่อยู่ไทย — พิมพ์ "รหัสไปรษณีย์" หรือ "ตำบล/อำเภอ/จังหวัด" แล้วเลือกจากรายการ
 * → เติม ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ ให้อัตโนมัติทั้งหมด (auto-fill)
 */
export default function ThaiAddressAutocomplete({
  value, onChange, error,
}: {
  value: ThaiGeo | null;
  onChange: (v: ThaiGeo | null) => void;
  error?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ThaiAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ค้นหา (debounce 200ms) — ตัวเลขล้วน = รหัสไปรษณีย์, อื่น ๆ = ตำบล+อำเภอ
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const query = q.trim();
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const db = await loadDB();
        const isZip = /^\d+$/.test(query);
        const raw = isZip
          ? db.searchAddressByZipcode(query)
          : [...db.searchAddressByDistrict(query), ...db.searchAddressByAmphoe(query)];
        const seen = new Set<string>();
        const list = raw.filter((r) => {
          const k = `${r.district}|${r.amphoe}|${r.province}|${r.zipcode}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).slice(0, 8);
        setResults(list);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const pick = (r: ThaiAddress) => {
    onChange({ subdistrict: r.district, district: r.amphoe, province: r.province, zipcode: String(r.zipcode) });
    setQ(""); setResults([]); setOpen(false);
  };

  // เลือกแล้ว → โชว์สรุป + ปุ่มแก้ไข
  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success-border bg-success-bg/50 p-3.5">
        <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-success-text" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-text-heading">ต.{value.subdistrict} · อ.{value.district}</p>
          <p className="text-text-muted">จ.{value.province} · {value.zipcode}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-yellow-text hover:text-text-heading">
          <Pencil size={13} /> แก้ไข
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      {loading
        ? <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 animate-spin text-text-muted" size={17} />
        : <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={17} />}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        inputMode="text"
        aria-label="ค้นหาตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์"
        placeholder="พิมพ์รหัสไปรษณีย์ หรือ ตำบล/อำเภอ/จังหวัด"
        className={`input-dd pl-11 ${error ? "field-error" : ""}`}
      />
      {open && results.length > 0 && (
        <div className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border-default bg-white shadow-[var(--shadow-hover)]">
          {results.map((r, i) => (
            <button
              key={`${r.district}-${r.amphoe}-${r.zipcode}-${i}`}
              type="button"
              onClick={() => pick(r)}
              className="flex w-full items-start gap-2.5 border-b border-border-subtle px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-bg-subtle"
            >
              <MapPin size={15} className="mt-0.5 flex-shrink-0 text-yellow-hover" />
              <span className="min-w-0 text-sm">
                <span className="font-medium text-text-heading">ต.{r.district} » อ.{r.amphoe}</span>
                <span className="block text-xs text-text-muted">จ.{r.province} · {r.zipcode}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && q.trim().length >= 2 && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-border-default bg-white p-4 text-center text-sm text-text-muted shadow-[var(--shadow-hover)]">
          ไม่พบที่อยู่ที่ตรงกับ &quot;{q.trim()}&quot;
        </div>
      )}
    </div>
  );
}
