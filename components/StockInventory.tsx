"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import {
  Warehouse, Loader2, AlertTriangle, RefreshCw,
  PackageCheck, Sparkles, RotateCcw, Search, ChevronRight, BatteryMedium,
  Pencil, X, UploadCloud, ImageOff
} from "lucide-react";
import toast from "react-hot-toast";
import CountUp from "@/components/CountUp";
import { compressImage } from "@/lib/imageCompress";

/* ---------- ชนิดข้อมูลตาม API จริงของระบบ stock ---------- */
interface StockSummary {
  totalAvailable: number;
  newAvailable: number;
  secondHandAvailable: number;
}

// /inventory/serials → SerializedItemResponse (Page)
interface SerialItem {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  imei: string | null;
  imei2: string | null;
  serialNumber: string | null;
  stockCode: string | null;
  status: string;            // IN_STOCK | SOLD | ...
  condition: string;         // NEW | SECOND_HAND
  receivedAt: string | null;
  sellingPrice: number | null;
  deviceColor: string | null;
  deviceStorage: string | null;
  deviceNetwork: string | null;
  batteryHealth: number | null;
}

interface LowStockAlert {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  currentQty: number;
  thresholdQty: number;
  status: string;
}

// รุ่นย่อย (variant) ที่จัดกลุ่มจากเครื่องรายตัว
interface VariantGroup {
  variantId: string;
  sku: string;
  productName: string;
  color: string | null;
  storage: string | null;
  network: string | null;
  units: SerialItem[];
  total: number;
  newCount: number;
  usedCount: number;
  minPrice: number | null;
  maxPrice: number | null;
}

// /products/{id}/variants → VariantResponse (สำหรับแก้ราคา/รูป)
interface VariantConfig {
  id: string;
  productId: string;
  productName: string | null;
  sku: string | null;
  color: string | null;
  storage: string | null;
  network: string | null;
  barcode: string | null;
  costPrice: number | null;
  sellingPrice: number | null;
  reorderPoint: number | null;
  imageUrl: string | null;
  imageUrls: string[] | null;
  active: boolean | null;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { content?: T[] }).content)) {
    return (data as { content: T[] }).content;
  }
  return [];
}

const money = (v: number | null) => (v == null ? "-" : "฿" + Number(v).toLocaleString());

const priceRange = (min: number | null, max: number | null) => {
  if (min == null) return "-";
  if (max == null || min === max) return money(min);
  return `${money(min)} - ${money(max)}`;
};

const formatDate = (v: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
};

const conditionLabel = (c: string) =>
  c === "NEW" ? "ใหม่" : c === "SECOND_HAND" ? "มือสอง" : c;

const specText = (color: string | null, storage: string | null, network: string | null) =>
  [color, storage, network].filter(Boolean).join(" / ") || "-";

export default function StockInventory() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [items, setItems] = useState<SerialItem[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cfgMap, setCfgMap] = useState<Record<string, VariantConfig>>({});
  const [editing, setEditing] = useState<VariantConfig | null>(null);

  // ดึง Stock real-time ผ่าน DD backend (BFF) — ใช้ token admin เดิม ไม่ต้อง login stock แยก
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, itemsRes, alertRes, varRes] = await Promise.all([
        api.get("/admin/stock/summary"),
        api.get("/admin/stock/serials"),
        api.get("/admin/stock/low-stock"),
        api.get("/admin/stock/variants").catch(() => null), // ใช้แก้ราคา/รูป — ถ้าพังไม่ทำให้คลังล่ม
      ]);
      setSummary(sumRes.data);
      setItems(toArray<SerialItem>(itemsRes.data));
      setAlerts(toArray<LowStockAlert>(alertRes.data));
      if (varRes) {
        const map: Record<string, VariantConfig> = {};
        for (const v of toArray<VariantConfig>(varRes.data)) map[v.id] = v;
        setCfgMap(map);
      }
    } catch (error: any) {
      console.error("Stock fetch error:", error);
      toast.error(error?.response?.status === 503
        ? "เชื่อมต่อระบบ Stock ไม่ได้ในขณะนี้"
        : "ดึงข้อมูล Stock ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // รีเฟรช + ล้างแคช catalog หน้าเว็บ (60 วิ) ทันที — ใช้หลังแก้/ลบรูปหรือสินค้าใน Stock
  const refreshAll = useCallback(async () => {
    await api.post("/admin/stock/refresh-catalog").catch(() => { /* ล้มก็ยัง fetchAll ต่อ */ });
    await fetchAll();
    toast.success("รีเฟรชแล้ว — หน้าเว็บดึงสินค้า/รูปใหม่จาก Stock ทันที");
  }, [fetchAll]);

  // จัดกลุ่มเครื่อง IN_STOCK เป็นรุ่นย่อย (variant)
  const variants = useMemo<VariantGroup[]>(() => {
    const inStock = items.filter((i) => i.status === "IN_STOCK");
    const map = new Map<string, VariantGroup>();
    for (const it of inStock) {
      let g = map.get(it.variantId);
      if (!g) {
        g = {
          variantId: it.variantId,
          sku: it.sku,
          productName: it.productName,
          color: it.deviceColor,
          storage: it.deviceStorage,
          network: it.deviceNetwork,
          units: [],
          total: 0,
          newCount: 0,
          usedCount: 0,
          minPrice: null,
          maxPrice: null,
        };
        map.set(it.variantId, g);
      }
      g.units.push(it);
      g.total += 1;
      if (it.condition === "NEW") g.newCount += 1;
      else if (it.condition === "SECOND_HAND") g.usedCount += 1;
      if (it.sellingPrice != null) {
        g.minPrice = g.minPrice == null ? it.sellingPrice : Math.min(g.minPrice, it.sellingPrice);
        g.maxPrice = g.maxPrice == null ? it.sellingPrice : Math.max(g.maxPrice, it.sellingPrice);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [items]);

  const filteredVariants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return variants;
    return variants.filter((v) =>
      v.productName.toLowerCase().includes(q) ||
      v.sku.toLowerCase().includes(q) ||
      specText(v.color, v.storage, v.network).toLowerCase().includes(q) ||
      v.units.some((u) =>
        (u.serialNumber || "").toLowerCase().includes(q) ||
        (u.imei || "").toLowerCase().includes(q) ||
        (u.stockCode || "").toLowerCase().includes(q)
      )
    );
  }, [variants, search]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const summaryCards = [
    { label: "พร้อมขายทั้งหมด", value: summary?.totalAvailable ?? 0, icon: PackageCheck, color: "text-yellow" },
    { label: "เครื่องใหม่", value: summary?.newAvailable ?? 0, icon: Sparkles, color: "text-success-text" },
    { label: "เครื่องมือสอง", value: summary?.secondHandAvailable ?? 0, icon: RotateCcw, color: "text-info-text" },
  ];

  /* ---------- เชื่อมแล้ว: dashboard ---------- */
  return (
    <div className="space-y-6">
      {/* แถบสถานะ */}
      <div className="flex flex-col gap-3 border border-border-default bg-bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow p-2 text-black"><Warehouse size={18} /></div>
          <div>
            <p className="font-display text-sm uppercase tracking-wider text-text-heading">คลังสินค้า (Stock real-time)</p>
            <p className="text-xs text-text-muted">ดึงสดจากระบบ Stock — อัปเดตอัตโนมัติเมื่อมีการขาย</p>
          </div>
        </div>
        <button onClick={refreshAll} disabled={isLoading} className="btn-ghost" aria-label="รีเฟรชข้อมูล + อัปเดตหน้าเว็บ">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> รีเฟรช (อัปเดตหน้าเว็บ)
        </button>
      </div>

      {isLoading && !summary ? (
        <div className="flex flex-col items-center justify-center py-20 text-yellow">
          <Loader2 size={40} className="mb-4 animate-spin" />
          <p className="font-display uppercase tracking-widest">กำลังโหลดข้อมูลคลัง</p>
        </div>
      ) : (
        <>
          {/* summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {summaryCards.map((c, i) => (
              <div key={i} className="card-dd">
                <div className="mb-3 flex items-start justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center bg-bg-tinted ${c.color}`}><c.icon size={22} /></div>
                </div>
                <p className="text-xs text-text-muted">{c.label}</p>
                <CountUp value={c.value} className="block font-display text-4xl tabular-nums text-text-heading" />
              </div>
            ))}
          </div>

          {/* low stock alerts */}
          <div className="border border-border-default">
            <div className="flex items-center gap-2 border-b border-border-default bg-bg-surface p-4">
              <AlertTriangle className="text-yellow" size={20} />
              <h2 className="font-display text-xl">แจ้งเตือนสินค้าใกล้หมด ({alerts.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table-dd">
                <thead>
                  <tr><th>SKU</th><th>สินค้า</th><th className="text-center">คงเหลือ</th><th className="text-center">เกณฑ์</th><th>สถานะ</th></tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ไม่มีสินค้าใกล้หมด 🎉</td></tr>
                  ) : (
                    alerts.map((a) => (
                      <tr key={a.id}>
                        <td className="font-mono text-xs">{a.sku}</td>
                        <td className="font-semibold text-text-heading">{a.productName}</td>
                        <td className="text-center"><span className={`badge-dd ${a.currentQty === 0 ? "badge-error" : "badge-warning"}`}>{a.currentQty}</span></td>
                        <td className="text-center text-text-muted">{a.thresholdQty}</td>
                        <td><span className="badge-dd badge-info">{a.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* inventory by variant (รุ่นย่อย) */}
          <div className="border border-border-default">
            <div className="flex flex-col gap-3 border-b border-border-default bg-bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-xl">สต็อกตามรุ่นย่อย ({filteredVariants.length} รุ่น)</h2>
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา ชื่อ / SKU / สี / IMEI / Serial" aria-label="ค้นหารุ่นย่อย" className="input-dd pl-10" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table-dd">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>สินค้า / รุ่นย่อย</th><th>SKU</th><th>สเปค</th>
                    <th className="text-center">ใหม่ / มือสอง</th>
                    <th className="text-center">คงเหลือ</th>
                    <th className="text-right">ราคาขาย</th>
                    <th className="text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">
                      {variants.length === 0 ? "ไม่มีสินค้าพร้อมขาย" : "ไม่พบรุ่นที่ค้นหา"}
                    </td></tr>
                  ) : (
                    filteredVariants.map((v) => (
                      <FragmentRows
                        key={v.variantId}
                        v={v}
                        open={expanded.has(v.variantId)}
                        onToggle={() => toggle(v.variantId)}
                        cfg={cfgMap[v.variantId]}
                        onEdit={() => { const c = cfgMap[v.variantId]; if (c) setEditing(c); }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editing && (
        <EditVariantModal
          cfg={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchAll(); }}
        />
      )}
    </div>
  );
}

/* แถวรุ่นย่อย + แถวเครื่องรายตัว (กางออก) */
function FragmentRows({ v, open, onToggle, cfg, onEdit }: { v: VariantGroup; open: boolean; onToggle: () => void; cfg?: VariantConfig; onEdit: () => void }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-bg-tinted" onClick={onToggle}>
        <td className="text-center">
          <ChevronRight size={16} className={`text-text-muted transition-transform ${open ? "rotate-90 text-yellow" : ""}`} />
        </td>
        <td className="font-semibold text-text-heading">{v.productName}</td>
        <td className="font-mono text-xs text-text-muted">{v.sku}</td>
        <td className="text-text-muted">{specText(v.color, v.storage, v.network)}</td>
        <td className="text-center">
          <span className="badge-dd badge-success mr-1">{v.newCount} ใหม่</span>
          <span className="badge-dd badge-info">{v.usedCount} มือสอง</span>
        </td>
        <td className="text-center"><span className="badge-dd badge-warning">{v.total}</span></td>
        <td className="text-right font-display tabular-nums text-yellow">{priceRange(v.minPrice, v.maxPrice)}</td>
        <td className="text-center">
          {cfg ? (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="inline-flex items-center gap-1 border border-border-default px-2 py-1 text-xs font-semibold text-text-body hover:bg-bg-tinted"
              aria-label={`แก้ไขราคา/รูป ${v.productName}`}
            >
              <Pencil size={13} /> แก้ราคา/รูป
            </button>
          ) : (
            <span className="text-[10px] text-text-muted">-</span>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="bg-bg-subtle p-0">
            <div className="overflow-x-auto px-4 py-3">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-default text-[10px] uppercase tracking-widest text-text-muted">
                    <th className="py-2 pr-4 font-display">IMEI / Serial</th>
                    <th className="py-2 pr-4 font-display">สภาพ</th>
                    <th className="py-2 pr-4 font-display">แบต</th>
                    <th className="py-2 pr-4 font-display text-right">ราคาขาย</th>
                    <th className="py-2 font-display">รับเข้า</th>
                  </tr>
                </thead>
                <tbody>
                  {v.units.map((u) => (
                    <tr key={u.id} className="border-b border-border-subtle">
                      <td className="py-2 pr-4 font-mono text-xs text-text-heading">{u.serialNumber || u.imei || u.stockCode || "-"}</td>
                      <td className="py-2 pr-4">
                        <span className={`badge-dd ${u.condition === "NEW" ? "badge-success" : "badge-info"}`}>{conditionLabel(u.condition)}</span>
                      </td>
                      <td className="py-2 pr-4 text-text-muted">
                        {u.batteryHealth != null ? (
                          <span className="inline-flex items-center gap-1"><BatteryMedium size={14} /> {u.batteryHealth}%</span>
                        ) : "-"}
                      </td>
                      <td className="py-2 pr-4 text-right font-display tabular-nums text-yellow">{money(u.sellingPrice)}</td>
                      <td className="py-2 text-text-muted">{formatDate(u.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* หา URL จาก response ของ /files (Map<string,string>) แบบ robust */
function extractUrl(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const vals = Object.values(data as Record<string, unknown>).filter((x): x is string => typeof x === "string");
    return vals.find((x) => /^https?:\/\//.test(x)) || vals.find((x) => x.includes("/")) || vals[0] || null;
  }
  return null;
}

/* Modal แก้ไขสินค้า (variant = 1 เครื่อง) — ราคา + หลายรูป บันทึกกลับ Stock ผ่าน BFF */
function EditVariantModal({ cfg, onClose, onSaved }: { cfg: VariantConfig; onClose: () => void; onSaved: () => void }) {
  const [price, setPrice] = useState<string>(cfg.sellingPrice != null ? String(cfg.sellingPrice) : "");
  const initialImages = (cfg.imageUrls && cfg.imageUrls.length > 0)
    ? cfg.imageUrls
    : (cfg.imageUrl ? [cfg.imageUrl] : []);
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const MAX = 10;

  // อัปโหลดหลายรูปไป Stock /files → ได้ URL → ต่อท้าย (รูปแรก = ปก)
  const addImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (images.length >= MAX) { toast.error(`เพิ่มได้สูงสุด ${MAX} รูป`); return; }
    setUploading(true);
    try {
      const room = MAX - images.length;
      for (const f of Array.from(files).slice(0, room)) {
        const compressed = await compressImage(f);   // บีบก่อนอัป (กัน Stock bytea บวม)
        const fd = new FormData();
        fd.append("file", compressed);
        const up = await api.post("/admin/stock/files", fd, { headers: { "Content-Type": "multipart/form-data" } });
        const url = extractUrl(up.data);
        if (url) setImages((prev) => [...prev, url]);
        else toast.error("อัปโหลดรูปแล้วแต่อ่าน URL ไม่ได้");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));
  const makeCover = (idx: number) => setImages((prev) => {
    const next = [...prev];
    const [picked] = next.splice(idx, 1);
    return [picked, ...next];
  });

  const save = async () => {
    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum < 0) { toast.error("กรอกราคาขายให้ถูกต้อง"); return; }
    setSaving(true);
    try {
      // ส่ง UpdateVariantRequest ครบฟิลด์ (merge เดิม + ราคา + รูปหลายรูป) กันค่าอื่นถูกล้าง
      const body = {
        active: cfg.active ?? true,
        barcode: cfg.barcode,
        color: cfg.color,
        costPrice: cfg.costPrice,
        imageUrl: images[0] ?? null,   // รูปปก = รูปแรก
        imageUrls: images,             // หลายรูป (single source ที่ Stock)
        network: cfg.network,
        reorderPoint: cfg.reorderPoint,
        sellingPrice: priceNum,
        storage: cfg.storage,
      };
      await api.put(`/admin/stock/variants/${cfg.productId}/${cfg.id}`, body);
      toast.success("บันทึกไปยังคลังแล้ว — หน้าเว็บจะอัปเดตทันที");
      onSaved();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "บันทึกไม่สำเร็จ (บัญชี stock อาจไม่มีสิทธิ์แก้ไข)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md border border-border-default bg-bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-default p-4">
          <h3 className="font-display text-lg">แก้ไขราคา / รูป</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-heading" aria-label="ปิด"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <p className="font-semibold text-text-heading">{cfg.productName}</p>
            <p className="text-xs text-text-muted">{[cfg.color, cfg.storage, cfg.network].filter(Boolean).join(" / ")} · {cfg.sku}</p>
          </div>

          <div>
            <label htmlFor="ev-price" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-text-muted">ราคาขาย (บาท)</label>
            <input id="ev-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="input-dd" placeholder="เช่น 18900" />
            <p className="mt-1 text-[10px] text-text-muted">ราคาขายของเครื่องนี้ (บันทึกเข้า Stock — ไหลเข้าบิลตอนขายจริง)</p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">รูปสินค้า (หลายรูป)</span>
              {uploading && <Loader2 size={14} className="animate-spin text-text-muted" />}
            </div>
            {images.length === 0 ? (
              <div className="mb-2 flex h-16 items-center gap-2 text-text-muted"><ImageOff size={18} /> <span className="text-xs">ยังไม่มีรูป</span></div>
            ) : (
              <div className="mb-2 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={src + i} className={`relative h-16 w-16 overflow-hidden border bg-bg-subtle ${i === 0 ? "border-yellow ring-1 ring-yellow" : "border-border-default"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`รูป ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute bottom-0 left-0 bg-yellow px-1 text-[8px] font-bold text-black">ปก</span>}
                    {i !== 0 && (
                      <button onClick={() => makeCover(i)} className="absolute bottom-0 left-0 bg-black/60 px-1 text-[8px] text-white hover:bg-black" aria-label="ตั้งเป็นรูปปก">ตั้งปก</button>
                    )}
                    <button onClick={() => removeImage(i)} className="absolute right-0 top-0 bg-black/60 p-0.5 text-white hover:bg-error-text" aria-label="ลบรูปนี้"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <label className={`btn-ghost cursor-pointer ${uploading || images.length >= MAX ? "pointer-events-none opacity-50" : ""}`}>
              <UploadCloud size={16} /> เพิ่มรูป
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
            </label>
            <p className="mt-1 text-[10px] text-text-muted">เพิ่มได้หลายรูป (สูงสุด {MAX}) — รูปแรก = รูปปก · บันทึกเมื่อกด “บันทึก”</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border-default p-4">
          <button onClick={onClose} className="btn-ghost" disabled={saving}>ยกเลิก</button>
          <button onClick={save} disabled={saving || uploading} className="btn-primary">
            {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก</> : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
