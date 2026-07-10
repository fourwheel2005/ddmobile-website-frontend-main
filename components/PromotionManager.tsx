"use client";
import { useEffect, useMemo, useState } from "react";
import { Zap, Plus, Pencil, Trash2, Loader2, X, Search } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { baht } from "@/lib/money";
import { confirmDialog } from "@/components/ui/confirmDialog";
import { TableSkeleton } from "@/components/Skeletons";

interface Promotion {
  id: number; name: string; discountType: "PERCENT" | "AMOUNT"; value: number;
  target: "ALL" | "NEW_CUSTOMER"; scope: "ORDER" | "PRODUCT" | "CATEGORY"; scopeRef: string | null;
  minSubtotal: number | null; usageLimit: number | null; usedCount: number;
  startAt: string | null; endAt: string | null; stackGroup: string; priority: number;
  code: string | null; active: boolean; status: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "LIMIT" | "OFF";
}
interface CatalogLite { id: string; variantId: string; productName: string; conditionLabel: string; color: string | null; storage: string | null; category: string; minPrice: number | null; }

const STATUS_TH: Record<Promotion["status"], { t: string; c: string }> = {
  ACTIVE: { t: "ใช้งานอยู่", c: "badge-success" },
  SCHEDULED: { t: "ตั้งเวลาไว้", c: "badge-info" },
  EXPIRED: { t: "หมดเวลา", c: "badge-error" },
  LIMIT: { t: "สิทธิ์เต็มแล้ว", c: "badge-warning" },
  OFF: { t: "ปิดอยู่", c: "badge-warning" },
};
const SCOPE_TH = { ORDER: "ทั้งออเดอร์", PRODUCT: "สินค้าเฉพาะตัว (flash sale)", CATEGORY: "ทั้งหมวด" } as const;

const emptyForm = () => ({
  id: null as number | null, name: "", discountType: "PERCENT" as string, value: "",
  target: "ALL", scope: "ORDER", scopeRefIds: [] as string[], scopeCategory: "",
  minSubtotal: "", usageLimit: "", startAt: "", endAt: "",
  stackGroup: "ORDER", priority: "0", code: "", active: true,
});

export default function PromotionManager() {
  const [list, setList] = useState<Promotion[]>([]);
  const [catalog, setCatalog] = useState<CatalogLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [pickQ, setPickQ] = useState("");

  const load = () => {
    api.get("/admin/promotions").then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("โหลดโปรโมชั่นไม่สำเร็จ")).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    api.get("/catalog").then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => { /* picker เปล่า */ });
  }, []);

  const categories = useMemo(() => Array.from(new Set(catalog.map((c) => c.category).filter(Boolean))).sort(), [catalog]);
  const pickResults = useMemo(() => {
    const q = pickQ.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((c) => `${c.productName} ${c.color ?? ""} ${c.storage ?? ""}`.toLowerCase().includes(q)).slice(0, 8);
  }, [catalog, pickQ]);
  const catalogById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);

  const openAdd = () => { setForm(emptyForm()); setPickQ(""); setModal(true); };
  const openEdit = (p: Promotion) => {
    setForm({
      id: p.id, name: p.name, discountType: p.discountType, value: String(p.value),
      target: p.target, scope: p.scope,
      scopeRefIds: p.scope === "PRODUCT" && p.scopeRef ? p.scopeRef.split(",").map((s) => s.trim()).filter(Boolean) : [],
      scopeCategory: p.scope === "CATEGORY" ? (p.scopeRef ?? "") : "",
      minSubtotal: p.minSubtotal != null ? String(p.minSubtotal) : "",
      usageLimit: p.usageLimit != null ? String(p.usageLimit) : "",
      startAt: p.startAt ? p.startAt.slice(0, 16) : "", endAt: p.endAt ? p.endAt.slice(0, 16) : "",
      stackGroup: p.stackGroup, priority: String(p.priority), code: p.code ?? "", active: p.active,
    });
    setPickQ(""); setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("กรอกชื่อโปรก่อน"); return; }
    const v = Number(form.value);
    if (!Number.isFinite(v) || v <= 0) { toast.error("กรอกส่วนลดให้ถูกต้อง"); return; }
    if (form.discountType === "PERCENT" && v > 100) { toast.error("เปอร์เซ็นต์ต้องไม่เกิน 100"); return; }
    if (form.scope === "PRODUCT" && form.scopeRefIds.length === 0) { toast.error("เลือกสินค้าที่ร่วมโปรอย่างน้อย 1 ตัว"); return; }
    if (form.scope === "CATEGORY" && !form.scopeCategory) { toast.error("เลือกหมวดที่ร่วมโปร"); return; }
    setSaving(true);
    try {
      await api.post("/admin/promotions", {
        id: form.id, name: form.name.trim(), discountType: form.discountType, value: v,
        target: form.target, scope: form.scope,
        scopeRef: form.scope === "PRODUCT" ? form.scopeRefIds.join(",") : form.scope === "CATEGORY" ? form.scopeCategory : null,
        minSubtotal: form.minSubtotal === "" ? null : Number(form.minSubtotal),
        usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
        startAt: form.startAt || null, endAt: form.endAt || null,
        stackGroup: form.stackGroup.trim() || "ORDER", priority: Number(form.priority) || 0,
        code: form.code.trim() || null, active: form.active,
      });
      toast.success(form.id ? "แก้ไขโปรแล้ว" : "สร้างโปรแล้ว");
      setModal(false); load();
    } catch (e) { toast.error(getApiError(e, "บันทึกไม่สำเร็จ")); }
    finally { setSaving(false); }
  };

  const del = async (p: Promotion) => {
    if (!(await confirmDialog({ title: `ลบโปร "${p.name}"?`, confirmText: "ลบ", danger: true }))) return;
    try { await api.delete(`/admin/promotions/${p.id}`); toast.success("ลบแล้ว"); load(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  };

  const discountText = (p: Promotion) => p.discountType === "PERCENT" ? `-${p.value}%` : `-${baht(p.value)}`;
  const set = (patch: Partial<ReturnType<typeof emptyForm>>) => setForm((f) => ({ ...f, ...patch }));

  if (loading) return <div className="overflow-hidden rounded-2xl border border-border-default bg-white"><TableSkeleton rows={5} cols={7} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-default bg-white p-4">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow" size={20} />
          <h2 className="font-display text-xl">โปรโมชั่น / Flash Sale</h2>
          <span className="badge-dd badge-warning">{list.length} โปร</span>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> เพิ่มโปรโมชั่น</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
        <div className="max-h-[65vh] overflow-auto">
          <table className="table-dd">
            <thead><tr><th>ชื่อโปร</th><th>ส่วนลด</th><th>ใช้กับ</th><th>ช่วงเวลา</th><th>โค้ด</th><th className="text-center">ใช้ไป</th><th>สถานะ</th><th className="text-right">จัดการ</th></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-text-muted">ยังไม่มีโปรโมชั่น — กด "เพิ่มโปรโมชั่น" เพื่อเริ่ม flash sale แรก</td></tr>
              ) : list.map((p) => {
                const st = STATUS_TH[p.status];
                return (
                  <tr key={p.id}>
                    <td>
                      <p className="font-semibold text-text-heading">{p.name}</p>
                      <p className="text-xs text-text-muted">กลุ่ม {p.stackGroup} · priority {p.priority}{p.target === "NEW_CUSTOMER" ? " · ลูกค้าใหม่" : ""}</p>
                    </td>
                    <td className="font-display tabular-nums text-price">{discountText(p)}</td>
                    <td>
                      <p className="text-sm">{SCOPE_TH[p.scope]}</p>
                      {p.scope === "PRODUCT" && <p className="max-w-[200px] truncate text-xs text-text-muted">{p.scopeRef?.split(",").map((id) => catalogById.get(id.trim())?.productName ?? id.trim()).join(", ")}</p>}
                      {p.scope === "CATEGORY" && <p className="text-xs text-text-muted">{p.scopeRef}</p>}
                    </td>
                    <td className="text-xs text-text-muted">
                      {p.startAt || p.endAt ? <>{p.startAt ? new Date(p.startAt).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "ตอนนี้"} → {p.endAt ? new Date(p.endAt).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "ไม่กำหนด"}</> : "ตลอดเวลา"}
                    </td>
                    <td>{p.code ? <span className="font-mono text-xs font-semibold text-text-heading">{p.code}</span> : <span className="badge-dd badge-info">อัตโนมัติ</span>}</td>
                    <td className="text-center tabular-nums">{p.usedCount}{p.usageLimit != null ? `/${p.usageLimit}` : ""}</td>
                    <td><span className={`badge-dd ${st.c}`}>{st.t}</span></td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(p)} aria-label="แก้ไข" className="rounded-lg border border-info-border bg-info-bg p-1.5 text-info-text hover:bg-info-text hover:text-white"><Pencil size={14} /></button>
                        <button onClick={() => del(p)} aria-label="ลบ" className="rounded-lg border border-error-border bg-error-bg p-1.5 text-error-text hover:bg-error-text hover:text-white"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal เพิ่ม/แก้โปร — ฟอร์มตามสเปกระบบตัวอย่าง */}
      {modal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setModal(false)}>
          <div className="modal-dd max-h-[92vh] w-full max-w-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModal(false)} className="modal-close" aria-label="ปิด"><X size={20} /></button>
            <h2 className="card-title">{form.id ? "แก้ไขโปรโมชั่น" : "เพิ่มโปรโมชั่น"}</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="label-dd">ชื่อโปร *</label>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} className="input-dd" placeholder="เช่น ลด 10% เปิดร้าน" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dd">ชนิด</label>
                  <select value={form.discountType} onChange={(e) => set({ discountType: e.target.value })} className="input-dd">
                    <option value="PERCENT">ลดเป็นเปอร์เซ็นต์ (%)</option>
                    <option value="AMOUNT">ลดเป็นเงินบาท (฿)</option>
                  </select>
                </div>
                <div>
                  <label className="label-dd">{form.discountType === "PERCENT" ? "ลดกี่ % (1-100)" : "ลดกี่บาท"}</label>
                  <input type="number" min={1} value={form.value} onChange={(e) => set({ value: e.target.value })} className="input-dd" placeholder={form.discountType === "PERCENT" ? "เช่น 10" : "เช่น 500"} />
                </div>
              </div>
              <div>
                <label className="label-dd">กลุ่มลูกค้าเป้าหมาย</label>
                <select value={form.target} onChange={(e) => set({ target: e.target.value })} className="input-dd">
                  <option value="ALL">ทุกคน</option>
                  <option value="NEW_CUSTOMER">ลูกค้าใหม่ (ยังไม่เคยสั่งซื้อ)</option>
                </select>
              </div>
              <div>
                <label className="label-dd">ใช้กับ</label>
                <select value={form.scope} onChange={(e) => set({ scope: e.target.value })} className="input-dd">
                  <option value="ORDER">ทั้งออเดอร์</option>
                  <option value="PRODUCT">สินค้าเฉพาะตัว (flash sale)</option>
                  <option value="CATEGORY">ทั้งหมวด</option>
                </select>
              </div>

              {/* เลือกสินค้า (PRODUCT) — ค้นหาแล้วกดเพิ่มเป็น chip */}
              {form.scope === "PRODUCT" && (
                <div className="rounded-xl border border-yellow/40 bg-yellow/5 p-3">
                  <label className="label-dd">สินค้าที่ร่วมโปร *</label>
                  {form.scopeRefIds.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {form.scopeRefIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-text-heading ring-1 ring-border-default">
                          {catalogById.get(id)?.productName ?? id}
                          <button onClick={() => set({ scopeRefIds: form.scopeRefIds.filter((x) => x !== id) })} aria-label="เอาออก" className="text-text-muted hover:text-error-text"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                    <input value={pickQ} onChange={(e) => setPickQ(e.target.value)} className="input-dd min-h-0 py-2 pl-9 text-sm" placeholder="พิมพ์ชื่อรุ่นเพื่อค้นหา แล้วกดเพิ่ม..." />
                  </div>
                  {pickResults.length > 0 && (
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-lg border border-border-default bg-white">
                      {pickResults.map((c) => (
                        <button key={c.id} onClick={() => { if (!form.scopeRefIds.includes(c.id)) set({ scopeRefIds: [...form.scopeRefIds, c.id] }); setPickQ(""); }}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-bg-subtle">
                          <span className="truncate">{c.productName} <span className="text-xs text-text-muted">{[c.conditionLabel, c.color, c.storage].filter(Boolean).join(" · ")}</span></span>
                          <span className="ml-2 flex-shrink-0 text-xs font-semibold text-price">{baht(c.minPrice, "-")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {form.scope === "CATEGORY" && (
                <div>
                  <label className="label-dd">หมวดที่ร่วมโปร *</label>
                  <select value={form.scopeCategory} onChange={(e) => set({ scopeCategory: e.target.value })} className="input-dd">
                    <option value="">— เลือกหมวด —</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dd">ยอดขั้นต่ำ (บาท)</label>
                  <input type="number" min={0} value={form.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} className="input-dd" placeholder="0 = ไม่มีขั้นต่ำ" />
                </div>
                <div>
                  <label className="label-dd">จำกัดจำนวนครั้ง</label>
                  <input type="number" min={1} value={form.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} className="input-dd" placeholder="เว้นว่าง = ไม่จำกัด" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dd">เริ่ม (ถ้ามี)</label>
                  <input type="datetime-local" value={form.startAt} onChange={(e) => set({ startAt: e.target.value })} className="input-dd" />
                </div>
                <div>
                  <label className="label-dd">สิ้นสุด (ถ้ามี)</label>
                  <input type="datetime-local" value={form.endAt} onChange={(e) => set({ endAt: e.target.value })} className="input-dd" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-dd">กลุ่ม (ซ้อนข้ามกลุ่มได้)</label>
                  <input value={form.stackGroup} onChange={(e) => set({ stackGroup: e.target.value.toUpperCase() })} className="input-dd font-mono" placeholder="ORDER" />
                  <p className="mt-1 text-[11px] text-text-muted">โปรกลุ่มเดียวกันลูกค้าได้ตัวเดียว (ตัวที่ลดมากสุด) — คนละกลุ่มลดซ้อนกันได้</p>
                </div>
                <div>
                  <label className="label-dd">ลำดับความสำคัญ</label>
                  <input type="number" value={form.priority} onChange={(e) => set({ priority: e.target.value })} className="input-dd" placeholder="0" />
                  <p className="mt-1 text-[11px] text-text-muted">ใช้ตัดสินเมื่อส่วนลดเท่ากัน — เลขมากชนะ</p>
                </div>
              </div>
              <div className="rounded-xl bg-bg-tinted p-3">
                <label className="label-dd">โค้ดคูปอง <span className="font-normal text-text-muted">(เว้นว่าง = โปรอัตโนมัติ ไม่ต้องกรอกโค้ด)</span></label>
                <input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} className="input-dd font-mono" placeholder="เช่น SAVE50" />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-heading">
                <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} className="h-4 w-4 accent-yellow-hover" />
                เปิดใช้งานโปรนี้
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="btn-ghost">ยกเลิก</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก</> : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
