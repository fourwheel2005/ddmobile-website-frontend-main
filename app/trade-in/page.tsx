"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Banknote, ShieldCheck, Clock, Check, MessageCircle, Copy,
  ArrowRight, HelpCircle, Wallet,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import api from "@/lib/api";
import { baht } from "@/lib/money";
import { lineChatUrl } from "@/lib/contact";
import {
  DEVICE_TYPES, STORAGES, REGIONS, BATTERY, ACCESSORIES, WARRANTY, BODY, SCREEN, PROBLEMS, PROBLEM_NONE,
  emptyTradeIn, validateTradeIn, buildTradeInMessage, estimatePrice, type TradeInForm, type Choice,
} from "@/lib/tradeIn";

interface TradeInPrice { id: number; model: string; storage: string; basePrice: number; }
const OTHER_MODEL = "__other__";

export default function TradeInPage() {
  const [form, setForm] = useState<TradeInForm>(emptyTradeIn);
  const [prices, setPrices] = useState<TradeInPrice[]>([]);
  const [customModel, setCustomModel] = useState(false);   // รุ่นไม่อยู่ในรายการ → กรอกเอง (ไม่มีราคาประเมิน)
  const set = (patch: Partial<TradeInForm>) => setForm((f) => ({ ...f, ...patch }));

  // เติมชื่อจากบัญชีถ้าล็อกอินอยู่ (defer ด้วย rAF — ไม่ setState sync ใน effect)
  useEffect(() => {
    const f = requestAnimationFrame(() => {
      try { const u = localStorage.getItem("user"); if (u) { const p = JSON.parse(u); if (p?.name) setForm((prev) => ({ ...prev, name: p.name })); } } catch { /* */ }
    });
    return () => cancelAnimationFrame(f);
  }, []);

  // ราคาฐานที่แอดมินตั้ง (สำหรับคำนวณราคาประเมิน)
  useEffect(() => {
    api.get("/trade-in/prices").then((r) => setPrices(Array.isArray(r.data) ? r.data : [])).catch(() => { /* ไม่มีราคา → ส่ง LINE ตีราคา */ });
  }, []);

  const models = useMemo(() => Array.from(new Set(prices.map((p) => p.model))), [prices]);
  const storagesForModel = useMemo(() => prices.filter((p) => p.model === form.model).map((p) => p.storage), [prices, form.model]);
  const basePrice = useMemo(() => prices.find((p) => p.model === form.model && p.storage === form.storage)?.basePrice ?? null, [prices, form.model, form.storage]);
  const estimated = useMemo(() => estimatePrice(basePrice, form), [basePrice, form]);

  const pickModel = (value: string) => {
    if (value === OTHER_MODEL) { setCustomModel(true); set({ model: "", storage: "" }); return; }
    setCustomModel(false);
    // ตั้งรุ่น + reset ความจุถ้าไม่มีในรุ่นใหม่
    const storages = prices.filter((p) => p.model === value).map((p) => p.storage);
    set({ model: value, storage: storages.includes(form.storage) ? form.storage : "" });
  };

  // เลือกปัญหา: "ไม่มีปัญหา" ตัดกับข้ออื่น + ข้ออื่นตัด "ไม่มีปัญหา"
  const toggleProblem = (value: string) => {
    setForm((f) => {
      if (value === PROBLEM_NONE) return { ...f, problems: [PROBLEM_NONE] };
      const withoutNone = f.problems.filter((p) => p !== PROBLEM_NONE);
      const next = withoutNone.includes(value) ? withoutNone.filter((p) => p !== value) : [...withoutNone, value];
      return { ...f, problems: next };
    });
  };

  const submit = () => {
    const err = validateTradeIn(form);
    if (err) { toast.error(err); return; }
    const msg = buildTradeInMessage(form) + (estimated != null ? `\n\nราคาประเมินเบื้องต้น (จากเว็บ): ${baht(estimated)}` : "");
    // เปิดแชท LINE พร้อมข้อมูลเครื่อง (user gesture เดียว กัน Safari บล็อก) + คัดลอกสำรอง
    window.open(lineChatUrl(msg), "_blank", "noopener,noreferrer");
    navigator.clipboard?.writeText(msg).then(
      () => toast.success("เปิดแชท LINE พร้อมข้อมูลเครื่องแล้ว — ถ้าข้อความไม่ขึ้น วางจากที่คัดลอกได้เลย", { duration: 4000 }),
      () => toast("เปิดแชท LINE แล้ว ส่งข้อมูลหาแอดมินได้เลย", { icon: <MessageCircle size={18} className="text-line" /> }),
    );
  };

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">

      {/* ===== HERO / อธิบายบริการ ===== */}
      <section className="bg-bg-subtle">
        <div className="container-dd py-10 md:py-14">
          <span className="badge-dd badge-warning">ประเมินราคาฟรี · ไม่มีค่าใช้จ่าย</span>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-text-heading md:text-5xl">
            ไอโฟนแลกเงิน <span className="text-yellow-hover">เปลี่ยนเป็นเงินสดได้ทันที</span>
          </h1>
          <p className="mt-4 max-w-2xl text-text-muted md:text-lg">
            นำ iPhone / iPad ของคุณมาแลกเงินสด แล้วผ่อนใช้เครื่องเดิมต่อได้ — กรอกสภาพเครื่องด้านล่าง
            ทีมงานตีราคาจริงและติดต่อกลับทาง LINE ทันที
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Clock, t: "ได้เงินไว", d: "ประเมิน + ตีราคาภายในวันเดียว" },
              { icon: ShieldCheck, t: "ไม่ใช่การจำนำ", d: "ได้เครื่องกลับไปใช้ต่อ" },
              { icon: Banknote, t: "วงเงินสูง", d: "ตีราคาตามรุ่นและสภาพจริง" },
            ].map(({ icon: I, t, d }) => (
              <div key={t} className="flex items-start gap-3 rounded-2xl border border-border-default bg-white p-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow/15 text-yellow-hover"><I size={20} /></span>
                <span><span className="block font-bold text-text-heading">{t}</span><span className="text-sm text-text-muted">{d}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ฟอร์มประเมิน ===== */}
      <section className="container-dd py-8 md:py-12">
        <Reveal className="mx-auto max-w-3xl space-y-6">

          {/* 1. เครื่องของคุณ */}
          <FormCard step={1} title="เครื่องที่จะแลกเงิน">
            <Field label="ประเภทเครื่อง *">
              <RadioCards options={DEVICE_TYPES} value={form.deviceType} onChange={(v) => set({ deviceType: v })} cols={2} />
            </Field>
            <Field label="รุ่น *">
              {/* มีราคาในระบบ → เลือกจาก dropdown (คำนวณราคาประเมินให้), ไม่มี → เลือก "อื่นๆ" กรอกเอง */}
              {models.length > 0 && !customModel ? (
                <select value={form.model} onChange={(e) => pickModel(e.target.value)} className="input-dd cursor-pointer">
                  <option value="">— เลือกรุ่น —</option>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                  <option value={OTHER_MODEL}>รุ่นอื่นๆ (ไม่อยู่ในรายการ)</option>
                </select>
              ) : (
                <div className="space-y-2">
                  <input value={form.model} onChange={(e) => set({ model: e.target.value })} className="input-dd" placeholder="เช่น iPhone 17 Pro Max" />
                  {models.length > 0 && (
                    <button type="button" onClick={() => { setCustomModel(false); set({ model: "", storage: "" }); }} className="text-xs font-semibold text-yellow-text hover:text-text-heading">← เลือกจากรายการที่มีราคา</button>
                  )}
                </div>
              )}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ความจุ *">
                {!customModel && storagesForModel.length > 0 ? (
                  <RadioCards options={storagesForModel.map((s) => ({ value: s, label: s }))} value={form.storage} onChange={(v) => set({ storage: v })} cols={3} compact />
                ) : (
                  <RadioCards options={STORAGES} value={form.storage} onChange={(v) => set({ storage: v })} cols={3} compact />
                )}
              </Field>
              <Field label="สี (ถ้าทราบ)">
                <input value={form.color} onChange={(e) => set({ color: e.target.value })} className="input-dd" placeholder="เช่น Black Titanium" />
              </Field>
            </div>
            <Field label="เวอร์ชันเครื่อง *">
              <RadioCards options={REGIONS} value={form.region} onChange={(v) => set({ region: v })} cols={3} />
            </Field>
          </FormCard>

          {/* 2. สภาพเครื่อง */}
          <FormCard step={2} title="สภาพเครื่อง">
            <Field label="สุขภาพแบตเตอรี่ *">
              <RadioCards options={BATTERY} value={form.battery} onChange={(v) => set({ battery: v })} cols={3} />
            </Field>
            <Field label="อุปกรณ์เสริมที่มี *">
              <RadioCards options={ACCESSORIES} value={form.accessories} onChange={(v) => set({ accessories: v })} cols={3} />
            </Field>
            <Field label="ประกัน *">
              <RadioCards options={WARRANTY} value={form.warranty} onChange={(v) => set({ warranty: v })} cols={2} />
            </Field>
            <Field label="สภาพรอบเครื่อง (บอดี้) *">
              <RadioCards options={BODY} value={form.body} onChange={(v) => set({ body: v })} cols={2} />
            </Field>
            <Field label="สภาพหน้าจอ *">
              <RadioCards options={SCREEN} value={form.screen} onChange={(v) => set({ screen: v })} cols={2} />
            </Field>
            <Field label="ปัญหาตัวเครื่อง (เลือกได้มากกว่า 1) *">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CheckCard label="ไม่มีปัญหา" checked={form.problems.includes(PROBLEM_NONE)} onChange={() => toggleProblem(PROBLEM_NONE)} highlight />
                {PROBLEMS.map((o) => (
                  <CheckCard key={o.value} label={o.label} checked={form.problems.includes(o.value)} onChange={() => toggleProblem(o.value)} />
                ))}
              </div>
            </Field>
          </FormCard>

          {/* 3. ข้อมูลติดต่อ */}
          <FormCard step={3} title="ข้อมูลติดต่อกลับ">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ชื่อ-นามสกุล *">
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" className="input-dd" placeholder="ชื่อ นามสกุล" />
              </Field>
              <Field label="เบอร์โทร *">
                <input value={form.tel} onChange={(e) => set({ tel: e.target.value })} type="tel" inputMode="tel" autoComplete="tel" className="input-dd" placeholder="08x-xxx-xxxx" />
              </Field>
            </div>
            <Field label="รหัสไปรษณีย์ *">
              <input value={form.zipcode} onChange={(e) => set({ zipcode: e.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" autoComplete="postal-code" className="input-dd sm:max-w-[200px]" placeholder="เช่น 10250" />
            </Field>
          </FormCard>

          {/* ราคาประเมินเบื้องต้น (คำนวณสดจากราคาฐาน − หักตามสภาพ) */}
          {estimated != null ? (
            <div className="overflow-hidden rounded-2xl border-2 border-yellow bg-yellow/10">
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-text-heading"><Wallet size={16} className="text-yellow-hover" /> ราคาประเมินเบื้องต้น</p>
                  <p className="mt-0.5 text-xs text-text-muted">{form.model} {form.storage} · หักตามสภาพที่เลือก</p>
                </div>
                <p className="flex-shrink-0 text-2xl font-bold text-price md:text-3xl">{baht(estimated)}</p>
              </div>
            </div>
          ) : (form.model && form.storage) ? (
            <div className="rounded-2xl border border-info-border bg-info-bg p-4 text-sm text-info-text">
              <p className="flex items-start gap-1.5"><Wallet size={15} className="mt-0.5 flex-shrink-0" /> รุ่นนี้ยังไม่มีราคาประเมินอัตโนมัติ — กรอกข้อมูลแล้วส่งให้ทีมงานตีราคาทาง LINE ได้เลย</p>
            </div>
          ) : null}

          {/* หมายเหตุ + ปุ่มส่ง */}
          <div className="rounded-2xl border border-border-default bg-bg-subtle p-4 text-xs text-text-muted">
            <p className="flex items-start gap-1.5"><HelpCircle size={14} className="mt-0.5 flex-shrink-0" /> การประเมินผ่านเว็บเป็นการประเมินเบื้องต้น จำนวนเงินและเงื่อนไขสุดท้ายจะพิจารณาจากสภาพเครื่องจริงที่สาขา และตกลงร่วมกันก่อนดำเนินการ</p>
          </div>

          <button onClick={submit} className="line-cta flex w-full items-center justify-center gap-2 rounded-full bg-line py-4 text-base font-bold text-white shadow-[var(--shadow-line)] transition-transform hover:-translate-y-0.5">
            <MessageCircle size={22} /> ส่งข้อมูลให้ตีราคาทาง LINE
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-text-muted">
            <Copy size={12} /> กดแล้วเปิดแชท LINE พร้อมข้อมูลเครื่อง — ทีมงานตีราคาและติดต่อกลับ
          </p>

          <div className="pt-2 text-center">
            <Link href="/products" className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-text hover:text-text-heading">
              หรือดูสินค้าผ่อน <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/* ---------- ชิ้นส่วน UI ---------- */

function FormCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <div className="card-dd">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow text-sm font-bold text-on-yellow">{step}</span>
        <h2 className="text-lg font-bold text-text-heading">{title}</h2>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-text-heading">{label}</p>
      {children}
    </div>
  );
}

function RadioCards({ options, value, onChange, cols, compact }: {
  options: Choice[]; value: string; onChange: (v: string) => void; cols: 2 | 3; compact?: boolean;
}) {
  const grid = compact ? "grid-cols-2 sm:grid-cols-5" : (cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2");
  return (
    <div className={`grid gap-2 ${grid}`}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-all ${
              active ? "border-yellow bg-yellow/10 font-semibold text-text-heading ring-1 ring-yellow" : "border-border-default text-text-body hover:border-yellow hover:bg-bg-tinted"
            }`}
          >
            <input type="radio" checked={active} onChange={() => onChange(o.value)} className="sr-only" />
            <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-yellow-hover" : "border-border-default"}`}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-yellow-hover" />}
            </span>
            <span className="min-w-0">{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function CheckCard({ label, checked, onChange, highlight }: { label: string; checked: boolean; onChange: () => void; highlight?: boolean }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-all ${
        checked
          ? (highlight ? "border-success-border bg-success-bg font-semibold text-success-text" : "border-yellow bg-yellow/10 font-semibold text-text-heading ring-1 ring-yellow")
          : "border-border-default text-text-body hover:border-yellow hover:bg-bg-tinted"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${checked ? (highlight ? "border-success-text bg-success-text text-white" : "border-yellow-hover bg-yellow-hover text-on-yellow") : "border-border-default"}`}>
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0">{label}</span>
    </label>
  );
}
