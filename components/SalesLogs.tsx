"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import {
  Receipt, ArrowDownUp, RefreshCw, Loader2, Search,
  Globe, Store, ArrowDownToLine, ArrowUpFromLine, Settings2
} from "lucide-react";
import toast from "react-hot-toast";

/* ---------- ชนิดข้อมูลตาม API จริงของ Stock ---------- */
interface SalesBill {
  id: string; billNo: string; status: string;
  customerName: string | null; customerPhone: string | null;
  orderChannel: string | null; paymentMethod: string | null;
  grandTotal: number | null; paidAmount: number | null;
  installmentMonths: number | null; downPaymentAmount: number | null;
  createdAt: string | null;
}
interface StockTxn {
  id: string; transactionNo: string; type: string;
  productName: string | null; sku: string | null;
  quantity: number | null; qtyBefore: number | null; qtyAfter: number | null;
  referenceNo: string | null; referenceType: string | null;
  performedAt: string | null;
}

function toArr<T>(d: any): T[] {
  return Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
}
import { baht as money } from "@/lib/money";
const dt = (v: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const channel = (c: string | null) =>
  c === "ONLINE" ? { label: "เว็บไซต์", cls: "badge-info", icon: Globe }
  : { label: "หน้าร้าน", cls: "badge-warning", icon: Store };
const payLabel = (p: string | null) => ({
  CASH: "เงินสด", TRANSFER: "โอน", QR: "QR/พร้อมเพย์", INSTALLMENT: "ผ่อน", CARD: "บัตร", MIXED: "ผสม",
} as Record<string, string>)[p || ""] || (p || "-");

// ประเภทความเคลื่อนไหว: เข้า (เขียว) / ออก-ขาย (เหลือง-แดง) / ปรับ (ฟ้า)
const txnKind = (t: string) => {
  const u = (t || "").toUpperCase();
  if (u.includes("OUT") || u.includes("SALE") || u.includes("SOLD")) return { cls: "badge-warning", icon: ArrowUpFromLine, label: "ออก" };
  if (u.includes("IN") || u.includes("INBOUND") || u.includes("RECEIVE")) return { cls: "badge-success", icon: ArrowDownToLine, label: "เข้า" };
  return { cls: "badge-info", icon: Settings2, label: "ปรับ" };
};

type Tab = "sales" | "moves";

export default function SalesLogs() {
  const [tab, setTab] = useState<Tab>("sales");
  const [sales, setSales] = useState<SalesBill[]>([]);
  const [moves, setMoves] = useState<StockTxn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [salesRes, movesRes] = await Promise.all([
        api.get("/admin/stock/sales"),
        api.get("/admin/stock/transactions"),
      ]);
      setSales(toArr<SalesBill>(salesRes.data));
      setMoves(toArr<StockTxn>(movesRes.data));
    } catch (error: any) {
      toast.error(error?.response?.status === 503
        ? "เชื่อมต่อระบบ Stock ไม่ได้ในขณะนี้"
        : "ดึงบันทึกการขาย/สต็อกไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = [...sales].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    if (!q) return arr;
    return arr.filter((s) => `${s.billNo} ${s.customerName ?? ""} ${s.customerPhone ?? ""}`.toLowerCase().includes(q));
  }, [sales, search]);

  const filteredMoves = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = [...moves].sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""));
    if (!q) return arr;
    return arr.filter((m) => `${m.transactionNo} ${m.productName ?? ""} ${m.sku ?? ""} ${m.referenceNo ?? ""}`.toLowerCase().includes(q));
  }, [moves, search]);

  return (
    <div className="space-y-4">
      {/* แถบหัว + แท็บย่อย + ค้นหา */}
      <div className="flex flex-col gap-3 border border-border-default bg-bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTab("sales")} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === "sales" ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`}>
            <Receipt size={15} /> บิลการขาย <span className="opacity-60">({sales.length})</span>
          </button>
          <button onClick={() => setTab("moves")} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === "moves" ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`}>
            <ArrowDownUp size={15} /> ความเคลื่อนไหวสต็อก <span className="opacity-60">({moves.length})</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหา บิล / สินค้า / ลูกค้า" aria-label="ค้นหาบันทึก" className="input-dd min-h-0 py-2 pl-9 text-sm" />
          </div>
          <button onClick={fetchAll} disabled={isLoading} className="btn-ghost" aria-label="รีเฟรช">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-yellow"><Loader2 size={40} className="mb-4 animate-spin" /><p className="font-display uppercase tracking-widest">กำลังโหลดบันทึก</p></div>
      ) : tab === "sales" ? (
        /* ---------- บิลการขาย ---------- */
        <div className="border border-border-default">
          <div className="overflow-x-auto">
            <table className="table-dd">
              <thead>
                <tr><th>เลขบิล / วันที่</th><th>ลูกค้า</th><th className="text-center">ช่องทาง</th><th className="text-center">ชำระ</th><th className="text-right">ยอดรวม</th><th>สถานะ</th></tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ยังไม่มีบิลการขาย</td></tr>
                ) : (
                  filteredSales.map((s) => {
                    const ch = channel(s.orderChannel);
                    return (
                      <tr key={s.id}>
                        <td><p className="font-mono text-xs font-semibold text-text-heading">{s.billNo}</p><p className="text-xs text-text-muted">{dt(s.createdAt)}</p></td>
                        <td><p className="font-semibold text-text-heading">{s.customerName || "ลูกค้าทั่วไป"}</p>{s.customerPhone && <p className="text-xs text-text-muted">{s.customerPhone}</p>}</td>
                        <td className="text-center"><span className={`badge-dd ${ch.cls}`}><ch.icon size={11} /> {ch.label}</span></td>
                        <td className="text-center text-sm text-text-body">{payLabel(s.paymentMethod)}{s.installmentMonths ? ` ${s.installmentMonths}ด.` : ""}</td>
                        <td className="text-right font-display tabular-nums text-yellow">{money(s.grandTotal)}</td>
                        <td><span className="badge-dd badge-info">{s.status}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ---------- ความเคลื่อนไหวสต็อก ---------- */
        <div className="border border-border-default">
          <div className="overflow-x-auto">
            <table className="table-dd">
              <thead>
                <tr><th>เลขที่ / วันที่</th><th>สินค้า / SKU</th><th className="text-center">ประเภท</th><th className="text-center">จำนวน</th><th className="text-center">ก่อน → หลัง</th><th>อ้างอิง</th></tr>
              </thead>
              <tbody>
                {filteredMoves.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center font-display uppercase tracking-widest text-text-muted">ยังไม่มีความเคลื่อนไหวสต็อก</td></tr>
                ) : (
                  filteredMoves.map((m) => {
                    const k = txnKind(m.type);
                    return (
                      <tr key={m.id}>
                        <td><p className="font-mono text-xs font-semibold text-text-heading">{m.transactionNo}</p><p className="text-xs text-text-muted">{dt(m.performedAt)}</p></td>
                        <td><p className="font-semibold text-text-heading">{m.productName || "-"}</p><p className="font-mono text-xs text-text-muted">{m.sku}</p></td>
                        <td className="text-center"><span className={`badge-dd ${k.cls}`}><k.icon size={11} /> {k.label} <span className="opacity-60">({m.type})</span></span></td>
                        <td className="text-center font-display tabular-nums text-text-heading">{m.quantity ?? "-"}</td>
                        <td className="text-center text-sm text-text-muted">{m.qtyBefore ?? "-"} → <span className="font-semibold text-text-heading">{m.qtyAfter ?? "-"}</span></td>
                        <td className="text-xs text-text-muted">{m.referenceNo || "-"}{m.referenceType ? ` · ${m.referenceType}` : ""}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
