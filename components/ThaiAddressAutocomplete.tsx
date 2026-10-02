"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { buildAddressIndex, searchAddress, type AddressRow, type ThaiGeo } from "@/lib/thaiAddress";

export type { ThaiGeo };

// lazy-load ฐานข้อมูลที่อยู่ (2 MB) เฉพาะตอนใช้จริง แล้วสร้าง index ครั้งเดียวต่อ session (~4ms)
// โหลดพลาด (เน็ตหลุดตอนดึง chunk) → ล้าง promise ให้ลองใหม่ได้ ไม่ค้าง reject ไว้ทั้ง session
let indexPromise: Promise<AddressRow[]> | null = null;
const loadIndex = () => (indexPromise ??= import("thai-address-database")
  // regex "." = ทุกแถว (lib ไม่มี API คืนทั้งหมด) — ทำครั้งเดียว ที่เหลือค้นใน index เอง
  .then((db) => buildAddressIndex(db.searchAddressByProvince(".", Number.MAX_SAFE_INTEGER)))
  .catch((e) => { indexPromise = null; throw e; }));

/**
 * ช่องค้นหาที่อยู่ไทย — พิมพ์ "รหัสไปรษณีย์" หรือ "ตำบล/อำเภอ/จังหวัด" แล้วเลือกจากรายการ
 * → เติม ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ ให้อัตโนมัติทั้งหมด (auto-fill)
 */
export default function ThaiAddressAutocomplete({
  value, onChange, error, inputId, disabled,
}: {
  value: ThaiGeo | null;
  onChange: (v: ThaiGeo | null) => void;
  error?: boolean;
  inputId?: string;      // ผูกกับ <label htmlFor>
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ThaiGeo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);   // กันผลค้นเก่ามาทับผลใหม่ (async ระหว่างรอโหลด DB ครั้งแรก)

  // ค้นหา (debounce 150ms) — ค้นใน index ใช้ไม่ถึง 1ms ช่วงหน่วงมีไว้แค่ไม่ให้ dropdown กระพริบ
  useEffect(() => {
    const query = q.trim();
    const id = ++seq.current;
    if (query.length < 2) { setResults([]); setOpen(false); setLoading(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const index = await loadIndex();
        if (id !== seq.current) return;
        setResults(searchAddress(index, query, 50));
        setOpen(true);
      } catch {
        if (id === seq.current) setResults([]);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [q]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const pick = (r: ThaiGeo) => {
    onChange(r);
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
        <button type="button" onClick={() => onChange(null)} disabled={disabled} className="flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-yellow-text hover:text-text-heading">
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
        id={inputId}
        value={q}
        disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
        // prefetch DB ตั้งแต่โฟกัส — พิมพ์ตัวแรกเสร็จ index ก็พร้อม (ไม่โหลด 2 MB ให้คนที่ไม่ได้แตะช่องนี้)
        onFocus={() => { loadIndex().catch(() => { /* ลองใหม่ตอนค้น */ }); if (results.length > 0) setOpen(true); }}
        inputMode="text"
        aria-label="ค้นหาตำบล อำเภอ จังหวัด หรือรหัสไปรษณีย์"
        placeholder="พิมพ์รหัสไปรษณีย์ หรือ ตำบล/อำเภอ/จังหวัด"
        className={`input-dd pl-11 ${error ? "field-error" : ""}`}
      />
      {open && results.length > 0 && (
        <div className="absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border-default bg-white shadow-[var(--shadow-hover)]">
          {results.map((r, i) => (
            <button
              key={`${r.subdistrict}-${r.district}-${r.zipcode}-${i}`}
              type="button"
              onClick={() => pick(r)}
              className="flex w-full items-start gap-2.5 border-b border-border-subtle px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-bg-subtle"
            >
              <MapPin size={15} className="mt-0.5 flex-shrink-0 text-yellow-hover" />
              <span className="min-w-0 text-sm">
                <span className="font-medium text-text-heading">ต.{r.subdistrict} » อ.{r.district}</span>
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
