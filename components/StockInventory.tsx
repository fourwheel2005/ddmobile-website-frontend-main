"use client";
import { useState, useEffect, useCallback } from "react";
import stockApi from "@/lib/stockApi";
import {
  Warehouse, Loader2, AlertTriangle, LogOut, RefreshCw,
  PackageCheck, Sparkles, RotateCcw, Search, LogIn
} from "lucide-react";
import toast from "react-hot-toast";

interface StockSummary {
  totalAvailable: number;
  newAvailable: number;
  secondHandAvailable: number;
}

interface InStockItem {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  imei: string | null;
  serialNumber: string | null;
  color: string | null;
  storage: string | null;
  sellingPrice: number | null;
  receivedAt: string | null;
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

interface StockUser {
  fullName?: string;
  username?: string;
  role?: string;
}

// แปลงผลลัพธ์ที่อาจเป็น array หรือ Spring Page ({content:[...]}) ให้เป็น array เสมอ
function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { content?: T[] }).content)) {
    return (data as { content: T[] }).content;
  }
  return [];
}

const money = (v: number | null) =>
  v == null ? "-" : "฿" + Number(v).toLocaleString();

const formatDate = (v: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
};

export default function StockInventory() {
  const [stockToken, setStockToken] = useState<string | null>(null);
  const [stockUser, setStockUser] = useState<StockUser | null>(null);

  // ฟอร์ม login (บัญชีของระบบ stock)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ข้อมูล
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [items, setItems] = useState<InStockItem[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  // โหลด token ที่เคยเก็บไว้
  useEffect(() => {
    const t = localStorage.getItem("stock_token");
    const u = localStorage.getItem("stock_user");
    if (t) setStockToken(t);
    if (u) {
      try { setStockUser(JSON.parse(u)); } catch { /* ignore */ }
    }
  }, []);

  const handleStockLogout = useCallback(() => {
    localStorage.removeItem("stock_token");
    localStorage.removeItem("stock_user");
    setStockToken(null);
    setStockUser(null);
    setSummary(null);
    setItems([]);
    setAlerts([]);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, itemsRes, alertRes] = await Promise.all([
        stockApi.get("/inventory/summary"),
        stockApi.get("/inventory/serials"),
        stockApi.get("/alerts/low-stock"),
      ]);
      setSummary(sumRes.data);
      setItems(toArray<InStockItem>(itemsRes.data));
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

  // มี token แล้วดึงข้อมูลทันที
  useEffect(() => {
    if (stockToken) fetchAll();
  }, [stockToken, fetchAll]);

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
      if (error?.response?.status === 401) {
        toast.error("ชื่อผู้ใช้หรือรหัสผ่าน Stock ไม่ถูกต้อง");
      } else if (error?.code === "ERR_NETWORK") {
        toast.error("เชื่อมต่อระบบ Stock ไม่ได้ (ตรวจ CORS ฝั่ง stock)");
      } else {
        toast.error("เข้าสู่ระบบ Stock ไม่สำเร็จ");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ---------- ยังไม่ได้เชื่อม: ฟอร์ม login ----------
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

  // ---------- เชื่อมแล้ว: dashboard ----------
  const filteredItems = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      it.productName?.toLowerCase().includes(q) ||
      it.sku?.toLowerCase().includes(q) ||
      it.imei?.toLowerCase().includes(q) ||
      it.serialNumber?.toLowerCase().includes(q)
    );
  });

  const summaryCards = [
    { label: "พร้อมขายทั้งหมด", value: summary?.totalAvailable ?? 0, icon: PackageCheck, color: "text-yellow" },
    { label: "เครื่องใหม่", value: summary?.newAvailable ?? 0, icon: Sparkles, color: "text-success-text" },
    { label: "เครื่องมือสอง", value: summary?.secondHandAvailable ?? 0, icon: RotateCcw, color: "text-info-text" },
  ];

  return (
    <div className="space-y-6">
      {/* แถบสถานะการเชื่อมต่อ */}
      <div className="flex flex-col gap-3 border border-border-default bg-bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-yellow p-2 text-black"><Warehouse size={18} /></div>
          <div>
            <p className="font-display text-sm uppercase tracking-wider text-white">
              เชื่อมต่อ Stock แล้ว
            </p>
            <p className="text-xs text-text-muted">
              {stockUser?.fullName || stockUser?.username || "ผู้ใช้ Stock"}
              {stockUser?.role ? ` · ${stockUser.role}` : ""}
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
                  <div className={`flex h-11 w-11 items-center justify-center bg-bg-tinted ${c.color}`}>
                    <c.icon size={22} />
                  </div>
                </div>
                <p className="text-xs text-text-muted">{c.label}</p>
                <h3 className="font-display text-4xl tabular-nums text-white">{c.value.toLocaleString()}</h3>
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
                        <td className="font-semibold text-white">{a.productName}</td>
                        <td className="text-center">
                          <span className={`badge-dd ${a.currentQty === 0 ? "badge-error" : "badge-warning"}`}>{a.currentQty}</span>
                        </td>
                        <td className="text-center text-text-muted">{a.thresholdQty}</td>
                        <td><span className="badge-dd badge-info">{a.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* in-stock serials */}
          <div className="border border-border-default">
            <div className="flex flex-col gap-3 border-b border-border-default bg-bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-xl">เครื่องในสต็อก ({filteredItems.length})</h2>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหา ชื่อ / SKU / IMEI / Serial"
                  aria-label="ค้นหาเครื่องในสต็อก"
                  className="input-dd pl-10"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table-dd">
                <thead>
                  <tr><th>สินค้า</th><th>SKU</th><th>IMEI / Serial</th><th>สี / ความจุ</th><th className="text-right">ราคาขาย</th><th>รับเข้า</th></tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">
                      {items.length === 0 ? "ไม่มีเครื่องในสต็อก" : "ไม่พบรายการที่ค้นหา"}
                    </td></tr>
                  ) : (
                    filteredItems.map((it) => (
                      <tr key={it.id}>
                        <td className="font-semibold text-white">{it.productName}</td>
                        <td className="font-mono text-xs text-text-muted">{it.sku}</td>
                        <td className="font-mono text-xs">{it.imei || it.serialNumber || "-"}</td>
                        <td className="text-text-muted">
                          {[it.color, it.storage].filter(Boolean).join(" / ") || "-"}
                        </td>
                        <td className="text-right font-display tabular-nums text-yellow">{money(it.sellingPrice)}</td>
                        <td className="text-text-muted">{formatDate(it.receivedAt)}</td>
                      </tr>
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
