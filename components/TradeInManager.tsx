"use client";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Save, Trash2, Loader2, Search, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { baht } from "@/lib/money";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { TableSkeleton } from "@/components/Skeletons";
import StatCard from "@/components/ui/StatCard";

interface TradeInPrice { id: number; model: string; storage: string; basePrice: number; active: boolean; }
const STORAGE_OPTS = ["64GB", "128GB", "256GB", "512GB", "1TB"];

/**
 * จัดการ "ราคารับซื้อ" (ไอโฟนแลกเงิน) — แอดมินตั้งราคาฐานต่อรุ่น+ความจุ
 * หน้าเว็บ /trade-in ดึงไปคำนวณราคาประเมิน (หัก % ตามสภาพให้อัตโนมัติ)
 */
export default function TradeInManager() {
  const [list, setList] = useState<TradeInPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const empty = { id: null as number | null, model: "", storage: "256GB", basePrice: "", active: true };
  const [form, setForm] = useState(empty);

  const load = () => {
    setLoading(true);
    api.get("/admin/trade-in/prices")
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("โหลดราคาไม่สำเร็จ"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.model.trim()) { toast.error("กรอกชื่อรุ่น"); return; }
    if (!form.storage) { toast.error("เลือกความจุ"); return; }
    const price = Number(form.basePrice);
    if (!Number.isFinite(price) || price < 0) { toast.error("กรอกราคาฐานให้ถูกต้อง"); return; }
    setSaving(true);
    try {
      await api.post("/admin/trade-in/prices", {
        id: form.id, model: form.model.trim(), storage: form.storage, basePrice: price, active: form.active,
      });
      toast.success(form.id ? "แก้ไขราคาแล้ว" : "เพิ่มราคาแล้ว");
      setForm(empty);
      load();
    } catch (e) { toast.error(getApiError(e, "บันทึกไม่สำเร็จ")); }
    finally { setSaving(false); }
  };

  const edit = (p: TradeInPrice) => {
    setForm({ id: p.id, model: p.model, storage: p.storage, basePrice: String(p.basePrice), active: p.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (p: TradeInPrice) => {
    if (!(await confirmDialog({ title: `ลบราคา "${p.model} ${p.storage}"?`, confirmText: "ลบ", danger: true }))) return;
    try { await api.delete(`/admin/trade-in/prices/${p.id}`); toast.success("ลบแล้ว"); load(); }
    catch (e) { toast.error(getApiError(e, "ลบไม่สำเร็จ")); }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? list.filter((p) => `${p.model} ${p.storage}`.toLowerCase().includes(s)) : list;
  }, [list, q]);

  const activeCount = list.filter((p) => p.active).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Wallet} label="รุ่นที่ตั้งราคารับซื้อ" value={list.length} unit="รายการ" iconClass="text-yellow" />
        <StatCard icon={Wallet} label="เปิดใช้อยู่ (โชว์หน้าเว็บ)" value={activeCount} unit="รายการ" iconClass="text-success-text" />
      </div>

      {/* ฟอร์มเพิ่ม/แก้ */}
      <div className="rounded-2xl border border-border-default bg-white p-5">
        <h3 className="mb-1 flex items-center gap-2 font-bold text-text-heading">
          <Plus size={18} className="text-yellow-hover" /> {form.id ? "แก้ไขราคารับซื้อ" : "เพิ่มราคารับซื้อ"}
        </h3>
        <p className="mb-4 text-xs text-text-muted">ตั้ง “ราคาฐาน” (สภาพดีสุด) — หน้าเว็บจะหักตามสภาพเครื่องให้อัตโนมัติ</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-text-muted">รุ่น *</span>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input-dd" placeholder="เช่น iPhone 17 Pro Max" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">ความจุ *</span>
            <select value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} className="input-dd cursor-pointer">
              {STORAGE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">ราคาฐาน (บาท) *</span>
            <input type="number" min={0} value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="input-dd" placeholder="เช่น 30000" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-heading">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-yellow-hover" />
            เปิดใช้ (แสดงหน้าเว็บ)
          </label>
          <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {form.id ? "บันทึกการแก้ไข" : "เพิ่มราคา"}
          </button>
          {form.id && <button onClick={() => setForm(empty)} className="btn-ghost"><X size={16} /> ยกเลิกแก้ไข</button>}
        </div>
      </div>

      {/* รายการ */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
        <div className="flex items-center justify-between border-b border-border-default bg-bg-surface p-4">
          <h2 className="flex items-center gap-2 font-display text-xl"><Wallet className="text-yellow" size={20} /> ราคารับซื้อทั้งหมด</h2>
          <div className="relative w-40 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารุ่น..." aria-label="ค้นหาราคา" className="input-dd py-2 pl-9 text-sm" />
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dd">
              <thead><tr><th>รุ่น</th><th>ความจุ</th><th className="text-right">ราคาฐาน</th><th>สถานะ</th><th className="text-right">จัดการ</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center font-display text-sm text-text-muted">{list.length === 0 ? "ยังไม่มีราคารับซื้อ — เพิ่มด้านบนเพื่อเริ่ม" : "ไม่พบรุ่นที่ค้นหา"}</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-text-heading">{p.model}</td>
                    <td>{p.storage}</td>
                    <td className="text-right font-display tabular-nums font-bold text-text-heading">{baht(p.basePrice)}</td>
                    <td>{p.active ? <span className="badge-dd badge-success">เปิดใช้</span> : <span className="badge-dd badge-warning">ปิดอยู่</span>}</td>
                    <td className="whitespace-nowrap text-right">
                      <button onClick={() => edit(p)} aria-label="แก้ไข" className="mr-1 rounded-lg px-2 py-1 text-xs font-semibold text-info-text hover:bg-info-bg"><Pencil size={13} className="mr-0.5 inline -translate-y-px" />แก้</button>
                      <button onClick={() => del(p)} aria-label="ลบ" className="rounded-lg p-2 text-error-text transition-colors hover:bg-error-bg"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
