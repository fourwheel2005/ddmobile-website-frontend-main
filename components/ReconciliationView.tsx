"use client";
import { useCallback, useEffect, useState } from "react";
import { Scale, CheckCircle2, AlertTriangle, FileWarning, Download, RefreshCw, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import { TableSkeleton } from "@/components/Skeletons";

/**
 * กระทบยอด เว็บ ↔ Stock (P2-1) + Export CSV บัญชี (P2-2)
 * เทียบ "รายบิล": ออเดอร์เว็บที่ตัดสต็อกแล้ว ต้องมีบิลใน Stock ที่ยอด/สถานะตรงกันทุกใบ
 */
interface Problem { orderId: number; billNo: string | null; orderStatus: string; webTotal: number | null; stockTotal: number | null; issue: string; }
interface Orphan { id: string | null; billNo: string | null; status: string | null; grandTotal: number | null; createdAt: string | null; }
interface Day { date: string; orders: number; total: number; matched: number; }
interface Result { totalWebOrders: number; matched: number; problems: Problem[]; orphanOnlineBills: Orphan[]; days: Day[]; note: string | null; }

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ReconciliationView() {
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  // ช่วง export CSV — ค่าเริ่มต้น: เดือนนี้
  const [from, setFrom] = useState(() => iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [exporting, setExporting] = useState(false);

  const load = useCallback((d: number) => {
    setLoading(true);
    api.get(`/admin/reconciliation?days=${d}`)
      .then((r) => setData(r.data))
      .catch(() => toast.error("กระทบยอดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get("/admin/orders/export", { params: { from, to }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("ดาวน์โหลดไม่สำเร็จ (ช่วงวันที่ไม่ถูกต้อง หรือยาวเกิน 1 ปี)");
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <div className="overflow-hidden rounded-2xl border border-border-default bg-white"><TableSkeleton rows={6} cols={5} /></div>;
  if (!data) return null;

  const problemCount = data.problems.length;
  const orphanCount = data.orphanOnlineBills.length;
  const allClear = problemCount === 0 && orphanCount === 0;

  return (
    <div className="space-y-5">
      {/* ควบคุมช่วง + refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="ช่วงเวลากระทบยอด" className="input-dd min-h-0 w-auto py-2 text-sm">
          <option value={7}>ย้อนหลัง 7 วัน</option>
          <option value={30}>ย้อนหลัง 30 วัน</option>
          <option value={90}>ย้อนหลัง 90 วัน</option>
        </select>
        <button onClick={() => load(days)} disabled={loading} className="btn-ghost">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} เทียบใหม่
        </button>
        {data.note && <span className="text-xs text-yellow-hover"><AlertTriangle size={12} className="mr-1 inline -translate-y-px" />{data.note}</span>}
      </div>

      {/* สรุป */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Scale} label="ออเดอร์เว็บ (ตัดสต็อกแล้ว)" value={data.totalWebOrders} unit="ใบ" iconClass="text-text-heading" />
        <StatCard icon={CheckCircle2} label="ตรงกันทุกอย่าง" value={data.matched} unit="ใบ" iconClass="text-success-text" />
        <StatCard icon={AlertTriangle} label="มีปัญหา" value={problemCount} unit="ใบ" iconClass={problemCount ? "text-error-text" : "text-text-muted"} />
        <StatCard icon={FileWarning} label="บิล ONLINE เกิน" value={orphanCount} unit="ใบ" iconClass={orphanCount ? "text-yellow-hover" : "text-text-muted"} />
      </div>

      {allClear && (
        <div className="flex items-center gap-2 rounded-2xl border border-success-border bg-success-bg p-4 text-sm font-semibold text-success-text">
          <CheckCircle2 size={18} /> ยอดเว็บกับ Stock ตรงกันทุกใบในช่วงที่เทียบ — ไม่มีเงินตกหล่น
        </div>
      )}

      {/* บิลมีปัญหา */}
      {problemCount > 0 && (
        <div className="overflow-hidden rounded-2xl border border-error-border bg-white">
          <div className="border-b border-error-border bg-error-bg p-4">
            <h3 className="font-bold text-error-text"><AlertTriangle size={16} className="mr-1.5 inline -translate-y-px" />บิลที่ต้องตรวจ ({problemCount})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table-dd">
              <thead><tr><th>ออเดอร์</th><th>เลขบิล</th><th>สถานะเว็บ</th><th className="text-right">ยอดเว็บ</th><th className="text-right">ยอด Stock</th><th>ปัญหา</th></tr></thead>
              <tbody>
                {data.problems.map((p) => (
                  <tr key={p.orderId}>
                    <td className="font-semibold text-text-heading">#{p.orderId}</td>
                    <td className="font-mono text-xs">{p.billNo || "-"}</td>
                    <td className="text-xs">{p.orderStatus}</td>
                    <td className="text-right tabular-nums">{p.webTotal != null ? `฿${p.webTotal.toLocaleString()}` : "-"}</td>
                    <td className="text-right tabular-nums">{p.stockTotal != null ? `฿${p.stockTotal.toLocaleString()}` : "-"}</td>
                    <td className="text-xs text-error-text">{p.issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* บิล ONLINE ใน Stock ที่ไม่มีออเดอร์เว็บคู่ */}
      {orphanCount > 0 && (
        <div className="overflow-hidden rounded-2xl border border-yellow bg-white">
          <div className="border-b border-yellow bg-yellow/10 p-4">
            <h3 className="font-bold text-text-heading"><FileWarning size={16} className="mr-1.5 inline -translate-y-px" />บิล ONLINE ใน Stock ที่ไม่มีออเดอร์เว็บคู่ ({orphanCount})</h3>
            <p className="mt-1 text-xs text-text-muted">อาจเป็นบิลที่พนักงานสร้างมือแล้วเลือก channel เป็น ONLINE — ตรวจว่าตั้งใจหรือไม่</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table-dd">
              <thead><tr><th>เลขบิล</th><th>สถานะ</th><th className="text-right">ยอด</th><th>วันที่</th></tr></thead>
              <tbody>
                {data.orphanOnlineBills.map((b, i) => (
                  <tr key={b.id ?? i}>
                    <td className="font-mono text-xs">{b.billNo || b.id || "-"}</td>
                    <td className="text-xs">{b.status || "-"}</td>
                    <td className="text-right tabular-nums">{b.grandTotal != null ? `฿${b.grandTotal.toLocaleString()}` : "-"}</td>
                    <td className="text-xs text-text-muted">{b.createdAt ? new Date(b.createdAt).toLocaleDateString("th-TH") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* รายวัน */}
      {data.days.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
          <div className="border-b border-border-default bg-bg-surface p-4"><h3 className="font-bold text-text-heading">สรุปรายวัน (ตามวันยืนยัน)</h3></div>
          <div className="overflow-x-auto">
            <table className="table-dd">
              <thead><tr><th>วันที่</th><th className="text-right">ออเดอร์</th><th className="text-right">ยอดรวม</th><th className="text-right">ตรงกัน</th><th>สถานะ</th></tr></thead>
              <tbody>
                {data.days.map((d) => (
                  <tr key={d.date}>
                    <td className="text-sm">{d.date}</td>
                    <td className="text-right tabular-nums">{d.orders}</td>
                    <td className="text-right font-semibold tabular-nums text-text-heading">฿{d.total.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{d.matched}/{d.orders}</td>
                    <td>{d.matched === d.orders
                      ? <span className="badge-dd badge-success">ครบ</span>
                      : <span className="badge-dd badge-error">ขาด {d.orders - d.matched}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export CSV บัญชี */}
      <div className="rounded-2xl border border-border-default bg-white p-4">
        <h3 className="font-bold text-text-heading"><Download size={16} className="mr-1.5 inline -translate-y-px" />Export CSV สำหรับทำบัญชี</h3>
        <p className="mt-1 text-xs text-text-muted">ออเดอร์ทุกสถานะในช่วงวันที่ (รวมยกเลิก/ปฏิเสธ/คืนเงิน) — เปิดใน Excel ได้ทันที</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="exp-from" className="label-dd text-xs">ตั้งแต่</label>
            <input id="exp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-dd min-h-0 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="exp-to" className="label-dd text-xs">ถึง</label>
            <input id="exp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-dd min-h-0 py-2 text-sm" />
          </div>
          <button onClick={exportCsv} disabled={exporting || !from || !to} className="btn-primary">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} ดาวน์โหลด CSV
          </button>
        </div>
      </div>
    </div>
  );
}
