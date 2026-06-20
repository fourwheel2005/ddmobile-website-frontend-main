"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import stockApi from "@/lib/stockApi";
import {
  Warehouse, Loader2, AlertTriangle, LogOut, RefreshCw,
  PackageCheck, Sparkles, RotateCcw, Search, LogIn, ChevronRight, BatteryMedium
} from "lucide-react";
import toast from "react-hot-toast";

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

interface StockUser { fullName?: string; username?: string; role?: string; }

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
  const [stockToken, setStockToken] = useState<string | null>(null);
  const [stockUser, setStockUser] = useState<StockUser | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [items, setItems] = useState<SerialItem[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = localStorage.getItem("stock_token");
    const u = localStorage.getItem("stock_user");
    if (t) setStockToken(t);
    if (u) { try { setStockUser(JSON.parse(u)); } catch { /* ignore */ } }
  }, []);

  const handleStockLogout = useCallback(() => {
    localStorage.removeItem("stock_token");
    localStorage.removeItem("stock_user");
    setStockToken(null);
    setStockUser(null);
    setSummary(null);
    setItems([]);
    setAlerts([]);
    setExpanded(new Set());
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, itemsRes, alertRes] = await Promise.all([
        stockApi.get("/inventory/summary"),
        stockApi.get("/inventory/serials", { params: { size: 500 } }),
        stockApi.get("/alerts/low-stock", { params: { size: 200 } }),
      ]);
      setSummary(sumRes.data);
      setItems(toArray<SerialItem>(itemsRes.data));
      setAlerts(toArray<LowStockAlert>(alertRes.data));
    } catch (error: any) {
      console.error("Stock fetch error:", error);
      if (error?.response?.status === 401) {
        toast.error("เซสชัน Stock หมดอายุ กรุณาเข้าสู่ระบบ Stock อีกครั้ง");
        handleStockLogout();
      } else if (error?.code === "ERR_NETWORK") {
        toast.error("เชื่อมต่อระบบ Stock ไม่ได้ (ตรวจ CORS ฝั่ง stock)");
      } else {
        toast.error("ดึงข้อมูล Stock ไม่สำเร็จ");
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleStockLogout]);

  useEffect(() => { if (stockToken) fetchAll(); }, [stockToken, fetchAll]);

  const handleStockLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await stockApi.post("/auth/login", { username, password });
      const { accessToken, user } = res.data;
      localStorage.setItem("stock_token", accessToken);
      if (user) localStorage.setItem("stock_user", JSON.stringify(user));
      setStockUser(user || null);
      setStockToken(accessToken);
      setPassword("");
      toast.success("เชื่อมต่อระบบ Stock สำเร็จ");
    } catch (error: any) {
      console.error("Stock login error:", error);
      if (error?.response?.status === 401) toast.error("ชื่อผู้ใช้หรือรหัสผ่าน Stock ไม่ถูกต้อง");
      else if (error?.code === "ERR_NETWORK") toast.error("เชื่อมต่อระบบ Stock ไม่ได้ (ตรวจ CORS ฝั่ง stock)");
      else toast.error("เข้าสู่ระบบ Stock ไม่สำเร็จ");
    } finally {
      setIsLoggingIn(false);
    }
  };

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

  /* ---------- ยังไม่เชื่อม: ฟอร์ม login ---------- */
  if (!stockToken) {
    return (
      <div className="mx-auto max-w-md border border-border-default bg-bg-surface p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-yellow p-3 text-black"><Warehouse size={24} /></div>
          <div>
            <h2 className="card-title mb-0">เชื่อมต่อคลังสินค้า</h2>
            <p className="text-xs text-text-muted">เข้าสู่ระบบด้วยบัญชี Stock (stockddmobile)</p>
          </div>
        </div>
        <form onSubmit={handleStockLogin} className="space-y-5">
          <div>
            <label htmlFor="stock-username" className="label-dd">ชื่อผู้ใช้ (Username)</label>
            <input id="stock-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="input-dd" placeholder="username" />
          </div>
          <div>
            <label htmlFor="stock-password" className="label-dd">รหัสผ่าน (Password)</label>
            <input id="stock-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input-dd" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isLoggingIn} className="btn-primary w-full">
            {isLoggingIn ? "กำลังเชื่อมต่อ..." : <><LogIn size={16} /> เชื่อมต่อ Stock →</>}
          </button>
        </form>
      </div>
    );
  }

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
            <p className="font-display text-sm uppercase tracking-wider text-text-heading">เชื่อมต่อ Stock แล้ว</p>
            <p className="text-xs text-text-muted">
              {stockUser?.fullName || stockUser?.username || "ผู้ใช้ Stock"}{stockUser?.role ? ` · ${stockUser.role}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} disabled={isLoading} className="btn-ghost" aria-label="รีเฟรชข้อมูล">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> รีเฟรช
          </button>
          <button onClick={handleStockLogout} className="btn-ghost" aria-label="ตัดการเชื่อมต่อ Stock">
            <LogOut size={16} /> ตัดการเชื่อมต่อ
          </button>
        </div>
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
                <h3 className="font-display text-4xl tabular-nums text-text-heading">{c.value.toLocaleString()}</h3>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">
                      {variants.length === 0 ? "ไม่มีสินค้าพร้อมขาย" : "ไม่พบรุ่นที่ค้นหา"}
                    </td></tr>
                  ) : (
                    filteredVariants.map((v) => (
                      <FragmentRows key={v.variantId} v={v} open={expanded.has(v.variantId)} onToggle={() => toggle(v.variantId)} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* แถวรุ่นย่อย + แถวเครื่องรายตัว (กางออก) */
function FragmentRows({ v, open, onToggle }: { v: VariantGroup; open: boolean; onToggle: () => void }) {
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
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="bg-bg-subtle p-0">
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
