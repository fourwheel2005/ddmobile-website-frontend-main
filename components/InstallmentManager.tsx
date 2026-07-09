"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Loader2, CreditCard, Smartphone, X, Download } from "lucide-react";
import toast from "react-hot-toast";
import { confirmDialog } from "@/components/ui/confirmDialog";
import api from "@/lib/api";

interface Term { months: number | string; monthly: number | string; }
interface Plan { id: number; productId: string; modelName: string | null; storage: string; downPayment: number | null; terms: { months: number; monthly: number }[]; note: string | null; active: boolean; }
interface SerialPlan { id: number; serialId: string; label: string | null; downPayment: number | null; months: number | null; monthly: number | null; terms: { months: number; monthly: number }[]; note: string | null; active: boolean; }
interface VariantOption { storage: string | null; }
interface CatalogItem { id: string; type: string; productName: string; sku: string; storage: string | null; conditionLabel: string; options: VariantOption[] | null; }

import { baht } from "@/lib/money";

/* ============================ ตารางผ่อนจากโปสเตอร์ (พรีเซ็ต — เฉพาะ "มือ 1") ============================ */
/* แอดมินกดนำเข้าได้เลย แล้วแก้ทีหลังได้
 * หมายเหตุ: ตารางบนสุดของโปสเตอร์ (iPhone 15/16/16 Plus 128GB ไม่มีป้าย) = "มือ 2" → ไม่รวมที่นี่
 * รวมเฉพาะ section ที่เขียน "(มือ 1)" + รุ่น Pro/Pro Max ที่อยู่ในตารางมือ 1 */
type PromoTerm = [number, number]; // [งวด, บาท/เดือน]
// มือ 1 (New) — คอลัมน์โปสเตอร์: ดาวน์ / 10 / 12 / 18 / 24 เดือน
const PROMO: Record<string, { down: number; terms: PromoTerm[] }> = {
  "iphone15|128":       { down: 4590,  terms: [[12, 2190], [18, 1790]] },
  "iphone16|128":       { down: 6990,  terms: [[12, 2290], [18, 1890], [24, 1890]] },
  "iphone16plus|128":   { down: 9900,  terms: [[12, 2290], [18, 1890], [24, 1890]] },
  "iphone16promax|256": { down: 18900, terms: [[10, 3390], [12, 2990]] },
  "ipadgen11|128":      { down: 3790,  terms: [[10, 1790]] },
  "ipadgen11|256":      { down: 4990,  terms: [[10, 1990]] },
  "ipadmini7|128":      { down: 5990,  terms: [[10, 1990]] },
  "iphone17|256":       { down: 8990,  terms: [[10, 1990], [12, 1990], [18, 1690]] },
  "iphone17pro|256":    { down: 16900, terms: [[12, 2390], [18, 2290], [24, 2090]] },
  "iphone17promax|256": { down: 18900, terms: [[12, 2690], [18, 2690], [24, 2290]] },
};

// มือ 2 (Used) — คอลัมน์โปสเตอร์: ดาวน์ / 10 / 12 / 15 / 18 เดือน (โปสเตอร์พิมพ์ 126GB = 128GB)
const PROMO_USED: Record<string, { down: number; terms: PromoTerm[] }> = {
  "iphone13|128":       { down: 1490,  terms: [[12, 1790], [15, 1590]] },
  "iphone13pro|128":    { down: 2590,  terms: [[10, 2190], [12, 1890], [15, 1690]] },
  "iphone13promax|128": { down: 2990,  terms: [[10, 3390], [12, 2290], [15, 1890]] },
  "iphone14pro|128":    { down: 1990,  terms: [[10, 2090], [12, 1890], [15, 1790]] },
  "iphone14promax|128": { down: 6590,  terms: [[10, 2290], [12, 1990], [15, 1790]] },
  "iphone15|128":       { down: 5990,  terms: [[10, 2490], [12, 2190], [15, 1890]] },
  "iphone15plus|128":   { down: 6990,  terms: [[10, 2590], [12, 2290], [15, 1990], [18, 1790]] },
  "iphone16pro|128":    { down: 7590,  terms: [[10, 2490], [12, 2290], [15, 1890], [18, 1690]] },
  "iphone16promax|256": { down: 10900, terms: [[10, 3090], [12, 2790], [15, 2490], [18, 2290]] },
  "iphone17|256":       { down: 8590,  terms: [[10, 2490], [12, 2490], [15, 1890], [18, 1690]] },
  "iphone17air|256":    { down: 8590,  terms: [[10, 2490], [12, 2290], [15, 1890], [18, 1690]] },
  "iphone17promax|256": { down: 15900, terms: [[10, 3090], [12, 3090], [15, 2790], [18, 2390]] },
};

/** แปลงชื่อรุ่นจาก catalog → key มาตรฐาน (รองรับ Apple/(พิเศษ)/Pro Max ฯลฯ) */
function canonModel(name: string): string {
  let s = (name || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/\+/g, " ");
  s = s.replace(/pro\s*max/g, "promax");
  const has = (...t: string[]) => t.every((x) => s.includes(x));
  if (s.includes("ipad")) {
    if (has("air")) return "ipadair7";
    if (has("mini")) return "ipadmini7";
    return "ipadgen11";
  }
  const m = s.match(/iphone\s*(\d+)/);
  if (m) {
    const n = m[1];
    if (s.includes("promax")) return `iphone${n}promax`;
    if (s.includes("pro")) return `iphone${n}pro`;
    if (s.includes("plus")) return `iphone${n}plus`;
    if (s.includes("air")) return `iphone${n}air`;
    return `iphone${n}`;
  }
  return s.replace(/[^a-z0-9]/g, "");
}
const storageDigits = (s: string | null | undefined) => String(s ?? "").replace(/[^0-9]/g, "");
function matchPromo(name: string, storage: string | null | undefined) {
  return PROMO[`${canonModel(name)}|${storageDigits(storage)}`] ?? null;
}
function matchUsed(name: string, storage: string | null | undefined) {
  return PROMO_USED[`${canonModel(name)}|${storageDigits(storage)}`] ?? null;
}

export default function InstallmentManager() {
  const [tab, setTab] = useState<"model" | "serial">("model");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [serials, setSerials] = useState<SerialPlan[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        api.get("/admin/installment/plans"),
        api.get("/admin/installment/serials"),
        api.get("/catalog"),
      ]);
      setPlans(Array.isArray(p.data) ? p.data : []);
      setSerials(Array.isArray(s.data) ? s.data : []);
      setCatalog(Array.isArray(c.data) ? c.data : []);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const models = useMemo(() => catalog.filter((c) => c.type === "MODEL"), [catalog]);
  const units = useMemo(() => catalog.filter((c) => c.type === "UNIT"), [catalog]);

  if (loading) return <div className="flex justify-center py-20 text-yellow-hover"><Loader2 className="animate-spin" /></div>;

  return (
    <div>
      <div className="mb-5 flex gap-2">
        <button onClick={() => setTab("model")} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === "model" ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`}>
          <CreditCard size={16} /> ตารางผ่อน (มือ 1 · ตามรุ่น)
        </button>
        <button onClick={() => setTab("serial")} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === "serial" ? "bg-text-heading text-white" : "bg-bg-subtle text-text-body hover:bg-border-default"}`}>
          <Smartphone size={16} /> ราคาพิเศษรายเครื่อง (มือ 2)
        </button>
      </div>

      {tab === "model" ? <ModelTab plans={plans} models={models} reload={load} /> : <SerialTab serials={serials} units={units} reload={load} />}
    </div>
  );
}

/* ============================ มือ 1: ตามรุ่น + ความจุ ============================ */
function ModelTab({ plans, models, reload }: { plans: Plan[]; models: CatalogItem[]; reload: () => void }) {
  const empty = { productId: "", modelName: "", storage: "", downPayment: "", note: "" };
  const [form, setForm] = useState(empty);
  const [terms, setTerms] = useState<Term[]>([{ months: 12, monthly: "" }]);
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);

  const storagesFor = (pid: string) => {
    const m = models.find((x) => x.id === pid);
    const set = new Set<string>();
    (m?.options ?? []).forEach((o) => { if (o.storage) set.add(o.storage); });
    return Array.from(set);
  };

  // กรอกราคาจากโปสเตอร์อัตโนมัติ เมื่อเลือกรุ่น+ความจุ (ถ้ามีในพรีเซ็ต)
  const pickModel = (pid: string) => {
    const m = models.find((x) => x.id === pid);
    const sts = m ? storagesFor(pid) : [];
    const storage = sts.length === 1 ? sts[0] : "";
    const promo = m && storage ? matchPromo(m.productName, storage) : null;
    setForm({ ...form, productId: pid, modelName: m?.productName ?? "", storage,
      downPayment: promo ? String(promo.down) : "" });
    setTerms(promo ? promo.terms.map(([months, monthly]) => ({ months, monthly })) : [{ months: 12, monthly: "" }]);
  };
  const pickStorage = (storage: string) => {
    const m = models.find((x) => x.id === form.productId);
    const promo = m && storage ? matchPromo(m.productName, storage) : null;
    setForm({ ...form, storage, downPayment: promo ? String(promo.down) : form.downPayment });
    if (promo) { setTerms(promo.terms.map(([months, monthly]) => ({ months, monthly }))); toast.success("กรอกราคาตามโปสเตอร์ให้แล้ว — ตรวจแล้วกดบันทึก"); }
  };

  // นำเข้าทุกรุ่นในคลังที่ตรงโปสเตอร์ (รุ่น × ความจุ) ในคลิกเดียว
  const importAll = async () => {
    if (!(await confirmDialog({ title: "นำเข้าราคาผ่อนตามโปสเตอร์?", message: "ใส่ให้ทุกรุ่น+ความจุที่มีในคลัง — ของเดิมที่ตรงกันจะถูกทับ" }))) return;
    setImporting(true);
    let ok = 0; const skipped: string[] = [];
    try {
      for (const m of models) {
        const sts = storagesFor(m.id);
        const list = sts.length ? sts : [""];
        for (const st of list) {
          const promo = matchPromo(m.productName, st);
          if (!promo) { skipped.push(`${m.productName} ${st}`.trim()); continue; }
          await api.post("/admin/installment/plans", {
            productId: m.id, modelName: m.productName, storage: st,
            downPayment: promo.down, terms: promo.terms.map(([months, monthly]) => ({ months, monthly })),
            note: null, active: true,
          });
          ok++;
        }
      }
      toast.success(`นำเข้า ${ok} รายการสำเร็จ${skipped.length ? ` · ข้าม ${skipped.length} (ไม่อยู่ในโปสเตอร์)` : ""}`, { duration: 5000 });
      reload();
    } catch {
      toast.error("นำเข้าไม่สำเร็จบางส่วน");
    } finally { setImporting(false); }
  };

  // ล้างตารางผ่อนทั้งหมด (ลบเฉพาะ "ราคาผ่อน" ไม่กระทบสินค้าใน Stock) — ไว้รีเซ็ตของผิดแล้วนำเข้าใหม่
  const clearAll = async () => {
    if (!(await confirmDialog({ title: "ล้างตารางผ่อน (มือ 1) ทั้งหมด?", message: "ลบเฉพาะราคาผ่อน ไม่กระทบตัวสินค้าใน Stock", confirmText: "ล้างทั้งหมด", danger: true }))) return;
    setImporting(true);
    try {
      const res = await api.get("/admin/installment/plans");
      const list: Plan[] = Array.isArray(res.data) ? res.data : [];
      for (const p of list) await api.delete(`/admin/installment/plans/${p.id}`);
      toast.success(`ล้างตารางผ่อนแล้ว ${list.length} รายการ`);
      reload();
    } catch {
      toast.error("ล้างไม่สำเร็จ");
    } finally { setImporting(false); }
  };

  const editPlan = (p: Plan) => {
    setForm({ productId: p.productId, modelName: p.modelName ?? "", storage: p.storage ?? "", downPayment: p.downPayment != null ? String(p.downPayment) : "", note: p.note ?? "" });
    setTerms(p.terms.length ? p.terms.map((t) => ({ months: t.months, monthly: t.monthly })) : [{ months: 12, monthly: "" }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!form.productId) { toast.error("เลือกรุ่นก่อน"); return; }
    const cleanTerms = terms
      .filter((t) => String(t.months).trim() && String(t.monthly).trim())
      .map((t) => ({ months: Number(t.months), monthly: Number(t.monthly) }));
    setSaving(true);
    try {
      await api.post("/admin/installment/plans", {
        productId: form.productId,
        modelName: form.modelName || models.find((m) => m.id === form.productId)?.productName || null,
        storage: form.storage || "",
        downPayment: form.downPayment ? Number(form.downPayment) : null,
        terms: cleanTerms,
        note: form.note || null,
        active: true,
      });
      toast.success("บันทึกตารางผ่อนแล้ว");
      setForm(empty); setTerms([{ months: 12, monthly: "" }]);
      reload();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally { setSaving(false); }
  };

  const del = async (id: number) => {
    if (!(await confirmDialog({ title: "ลบตารางผ่อนนี้?", confirmText: "ลบ", danger: true }))) return;
    try { await api.delete(`/admin/installment/plans/${id}`); toast.success("ลบแล้ว"); reload(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  };

  return (
    <div className="space-y-6">
      {/* ฟอร์ม */}
      <div className="rounded-2xl border border-border-default bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-text-heading">เพิ่ม / แก้ตารางผ่อน (มือ 1)</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={clearAll} disabled={importing} className="inline-flex items-center gap-2 rounded-xl border border-error-text/40 px-3 py-2 text-sm font-semibold text-error-text transition-colors hover:bg-error-bg disabled:opacity-50">
              <Trash2 size={15} /> ล้างทั้งหมด
            </button>
            <button onClick={importAll} disabled={importing} className="inline-flex items-center gap-2 rounded-xl bg-text-heading px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} นำเข้าราคาตามโปสเตอร์ (ทุกรุ่นในคลัง)
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-text-muted">เลือกรุ่น+ความจุ ระบบจะกรอกราคาตามโปสเตอร์ให้อัตโนมัติ (แก้ตัวเลขแล้วกดบันทึกได้)</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">รุ่น (เครื่องใหม่)</span>
            <select value={form.productId} onChange={(e) => pickModel(e.target.value)} className="input-dd">
              <option value="">— เลือกรุ่น —</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.productName}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">ความจุ</span>
            <select value={form.storage} onChange={(e) => pickStorage(e.target.value)} className="input-dd">
              <option value="">ทุกความจุ</option>
              {storagesFor(form.productId).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">เงินดาวน์ (บาท)</span>
            <input type="number" value={form.downPayment} onChange={(e) => setForm({ ...form, downPayment: e.target.value })} className="input-dd" placeholder="เช่น 6990" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">โปรโมชัน (ถ้ามี)</span>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-dd" placeholder="เช่น ฟรีฟิล์ม+เคส" />
          </label>
        </div>

        {/* งวด */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-text-muted">ค่างวด (เพิ่มได้หลายช่วง)</p>
          <div className="space-y-2">
            {terms.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="number" value={t.months} onChange={(e) => setTerms(terms.map((x, j) => j === i ? { ...x, months: e.target.value } : x))} className="input-dd w-24 min-w-0 text-sm" placeholder="งวด" />
                <span className="text-sm text-text-muted">เดือน ×</span>
                <input type="number" value={t.monthly} onChange={(e) => setTerms(terms.map((x, j) => j === i ? { ...x, monthly: e.target.value } : x))} className="input-dd w-32 min-w-0 text-sm" placeholder="บาท/เดือน" />
                <button onClick={() => setTerms(terms.filter((_, j) => j !== i))} className="rounded-lg p-2 text-error-text hover:bg-error-bg"><X size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setTerms([...terms, { months: "", monthly: "" }])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-yellow-hover hover:underline">
            <Plus size={14} /> เพิ่มงวด
          </button>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary mt-5 disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึก
        </button>
      </div>

      {/* รายการ */}
      <div className="overflow-x-auto rounded-2xl border border-border-default bg-white">
        <table className="table-dd">
          <thead><tr><th>รุ่น</th><th>ความจุ</th><th>ดาวน์</th><th>งวด</th><th>โปร</th><th></th></tr></thead>
          <tbody>
            {plans.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-text-muted">ยังไม่มีตารางผ่อน</td></tr>
            ) : plans.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-text-heading">{p.modelName || p.productId}</td>
                <td>{p.storage || "ทุกความจุ"}</td>
                <td className="font-display tabular-nums">{baht(p.downPayment)}</td>
                <td className="text-xs text-text-muted">{p.terms.map((t) => `${t.months}ด.${baht(t.monthly)}`).join(" · ") || "-"}</td>
                <td className="text-xs">{p.note || "-"}</td>
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => editPlan(p)} className="mr-1 rounded-lg px-2 py-1 text-xs font-semibold text-info-text hover:bg-info-bg">แก้</button>
                  <button onClick={() => del(p.id)} className="rounded-lg p-1.5 text-error-text hover:bg-error-bg"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================ มือ 2: รายเครื่อง ============================ */
function SerialTab({ serials, units, reload }: { serials: SerialPlan[]; units: CatalogItem[]; reload: () => void }) {
  const empty = { serialId: "", label: "", downPayment: "", note: "" };
  const [form, setForm] = useState(empty);
  const [terms, setTerms] = useState<Term[]>([{ months: 12, monthly: "" }]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // เลือกเครื่อง → กรอกราคามือ 2 ตามโปสเตอร์ให้อัตโนมัติ (ตามรุ่น+ความจุ)
  const pickDevice = (serialId: string) => {
    const u = units.find((x) => x.id === serialId);
    const promo = u ? matchUsed(u.productName, u.storage) : null;
    setForm({ serialId, label: u?.productName ?? "", downPayment: promo ? String(promo.down) : "", note: "" });
    setTerms(promo ? promo.terms.map(([months, monthly]) => ({ months, monthly })) : [{ months: 12, monthly: "" }]);
    if (promo) toast.success("กรอกราคามือ 2 ตามโปสเตอร์ให้แล้ว — ตรวจแล้วกดบันทึก");
  };

  const editSerial = (s: SerialPlan) => {
    setForm({ serialId: s.serialId, label: s.label ?? "", downPayment: s.downPayment != null ? String(s.downPayment) : "", note: s.note ?? "" });
    setTerms(s.terms?.length ? s.terms.map((t) => ({ months: t.months, monthly: t.monthly })) : [{ months: 12, monthly: "" }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!form.serialId) { toast.error("เลือกเครื่องก่อน"); return; }
    const cleanTerms = terms
      .filter((t) => String(t.months).trim() && String(t.monthly).trim())
      .map((t) => ({ months: Number(t.months), monthly: Number(t.monthly) }));
    setSaving(true);
    try {
      await api.post("/admin/installment/serials", {
        serialId: form.serialId,
        label: form.label || units.find((u) => u.id === form.serialId)?.productName || null,
        downPayment: form.downPayment ? Number(form.downPayment) : null,
        terms: cleanTerms,
        note: form.note || null,
        active: true,
      });
      toast.success("บันทึกราคาผ่อนพิเศษแล้ว");
      setForm(empty); setTerms([{ months: 12, monthly: "" }]);
      reload();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally { setSaving(false); }
  };

  // นำเข้าราคามือ 2 ตามโปสเตอร์ ให้ทุกเครื่องมือสองในคลังที่ตรงรุ่น+ความจุ
  const importAll = async () => {
    if (units.length === 0) { toast("ยังไม่มีเครื่องมือสองในคลัง"); return; }
    if (!(await confirmDialog({ title: "นำเข้าราคาผ่อนมือ 2 ตามโปสเตอร์?", message: "ใส่ให้ทุกเครื่องที่ตรงรุ่น+ความจุ" }))) return;
    setImporting(true);
    let ok = 0; const skipped: string[] = [];
    try {
      for (const u of units) {
        const promo = matchUsed(u.productName, u.storage);
        if (!promo) { skipped.push(`${u.productName}`); continue; }
        await api.post("/admin/installment/serials", {
          serialId: u.id, label: u.productName,
          downPayment: promo.down, terms: promo.terms.map(([months, monthly]) => ({ months, monthly })),
          note: null, active: true,
        });
        ok++;
      }
      toast.success(`นำเข้า ${ok} เครื่อง${skipped.length ? ` · ข้าม ${skipped.length}` : ""}`, { duration: 5000 });
      reload();
    } catch { toast.error("นำเข้าไม่สำเร็จบางส่วน"); }
    finally { setImporting(false); }
  };

  const clearAll = async () => {
    if (!(await confirmDialog({ title: "ล้างราคาผ่อนมือ 2 ทั้งหมด?", message: "ลบเฉพาะราคาผ่อน ไม่กระทบสินค้า", confirmText: "ล้างทั้งหมด", danger: true }))) return;
    setImporting(true);
    try {
      for (const s of serials) await api.delete(`/admin/installment/serials/${s.id}`);
      toast.success(`ล้างแล้ว ${serials.length} รายการ`);
      reload();
    } catch { toast.error("ล้างไม่สำเร็จ"); }
    finally { setImporting(false); }
  };

  const del = async (id: number) => {
    if (!(await confirmDialog({ title: "ลบราคาพิเศษนี้?", confirmText: "ลบ", danger: true }))) return;
    try { await api.delete(`/admin/installment/serials/${id}`); toast.success("ลบแล้ว"); reload(); }
    catch { toast.error("ลบไม่สำเร็จ"); }
  };

  const termText = (s: SerialPlan) => {
    const t = s.terms?.length ? s.terms : (s.months ? [{ months: s.months, monthly: s.monthly ?? 0 }] : []);
    return t.map((x) => `${x.months}ด.${baht(x.monthly)}`).join(" · ") || "-";
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-default bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-text-heading">เพิ่ม / แก้ราคาผ่อนพิเศษ (มือ 2 รายเครื่อง)</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={clearAll} disabled={importing} className="inline-flex items-center gap-2 rounded-xl border border-error-text/40 px-3 py-2 text-sm font-semibold text-error-text transition-colors hover:bg-error-bg disabled:opacity-50">
              <Trash2 size={15} /> ล้างทั้งหมด
            </button>
            <button onClick={importAll} disabled={importing} className="inline-flex items-center gap-2 rounded-xl bg-text-heading px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} นำเข้าราคามือ 2 ตามโปสเตอร์ (ทุกเครื่องในคลัง)
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-text-muted">เลือกเครื่อง ระบบจะกรอกราคามือ 2 ตามโปสเตอร์ให้อัตโนมัติ (แก้ตัวเลขแล้วกดบันทึกได้)</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-text-muted">เครื่อง (มือสอง)</span>
            <select value={form.serialId} onChange={(e) => pickDevice(e.target.value)} className="input-dd">
              <option value="">— เลือกเครื่อง —</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.productName} · {u.sku}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">เงินดาวน์ (บาท)</span>
            <input type="number" value={form.downPayment} onChange={(e) => setForm({ ...form, downPayment: e.target.value })} className="input-dd" placeholder="เช่น 5900" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-text-muted">ข้อความโปร (ถ้ามี)</span>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-dd" placeholder="เช่น พิเศษ ปรับดาวน์ 4900 ผ่อน 2280*12ด." />
          </label>
        </div>

        {/* ค่างวด (หลายช่วง) */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-text-muted">ค่างวด (เพิ่มได้หลายช่วง)</p>
          <div className="space-y-2">
            {terms.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="number" value={t.months} onChange={(e) => setTerms(terms.map((x, j) => j === i ? { ...x, months: e.target.value } : x))} className="input-dd w-24 min-w-0 text-sm" placeholder="งวด" />
                <span className="text-sm text-text-muted">เดือน ×</span>
                <input type="number" value={t.monthly} onChange={(e) => setTerms(terms.map((x, j) => j === i ? { ...x, monthly: e.target.value } : x))} className="input-dd w-32 min-w-0 text-sm" placeholder="บาท/เดือน" />
                <button onClick={() => setTerms(terms.filter((_, j) => j !== i))} className="rounded-lg p-2 text-error-text hover:bg-error-bg"><X size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setTerms([...terms, { months: "", monthly: "" }])} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-yellow-hover hover:underline">
            <Plus size={14} /> เพิ่มงวด
          </button>
        </div>

        <button onClick={save} disabled={saving} className="btn-primary mt-5 disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึก
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-default bg-white">
        <table className="table-dd">
          <thead><tr><th>เครื่อง</th><th>ดาวน์</th><th>งวด</th><th>โปร</th><th></th></tr></thead>
          <tbody>
            {serials.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-text-muted">ยังไม่มีราคาพิเศษรายเครื่อง</td></tr>
            ) : serials.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-text-heading">{s.label || s.serialId}</td>
                <td className="font-display tabular-nums">{baht(s.downPayment)}</td>
                <td className="text-xs text-text-muted">{termText(s)}</td>
                <td className="text-xs">{s.note || "-"}</td>
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => editSerial(s)} className="mr-1 rounded-lg px-2 py-1 text-xs font-semibold text-info-text hover:bg-info-bg">แก้</button>
                  <button onClick={() => del(s.id)} className="rounded-lg p-1.5 text-error-text hover:bg-error-bg"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
