"use client";
import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, CreditCard, FileText, CheckCircle2, IdCard, ArrowRight, Plus, Minus, ChevronUp, Pencil, TrendingDown } from "lucide-react";
import { downRange, effectiveDown, monthlyForDown, quickDowns, stepDown } from "@/lib/installment";

/** down = ดาวน์เฉพาะงวดนี้ (ร้านตั้งจาก Stock FIX-200) · null/ไม่มี = ใช้ดาวน์ของแผน */
export interface InstallmentTerm { months: number; monthly: number; down?: number | null; }
/** หนึ่งแผนผ่อน (ปุ่มเลือก) — ดาวน์ 1 ค่า + งวดหลายช่วง + โปรโม */
export interface InstallmentPlanOption {
  label: string | null;
  down: number | null;
  promo: string | null;
  terms: InstallmentTerm[];
}
export interface InstallmentInfo {
  kind: string;
  downPayment: number | null;   // = แผนแรก (back-compat)
  terms: InstallmentTerm[];      // = งวดของแผนแรก (back-compat)
  note: string | null;
  plans?: InstallmentPlanOption[] | null;   // แผนหลายแบบ (ปุ่มเลือก) — มีอย่างน้อย 1 แผนเมื่อมีข้อมูลผ่อน
}


import { baht } from "@/lib/money";

/** แผนที่ลูกค้าเลือกตอนกด "ยืนยันผ่อนเครื่องนี้" — ส่งต่อเป็น snapshot ในคำขอผ่อน */
export interface InstallmentSelection {
  planLabel: string | null;   // ชื่อแผน (+ โปรโมชัน) ถ้ามี
  downPayment: number | null;
  months: number | null;
  monthly: number | null;
}

const fmt = (n: number) => n.toLocaleString("th-TH");

/**
 * กล่องผ่อน: แสดง เงินดาวน์ + ค่างวดต่อเดือน (เลือกแผน/จำนวนงวดได้)
 * ปุ่ม "ยืนยันผ่อนเครื่องนี้" → onConfirm(แผนที่เลือก) — หน้าสินค้าเปิดฟอร์มแนบบัตรประชาชน แล้วค่อยส่งเข้า LINE
 * (ลิงก์ LINE แนบรูปบัตรไม่ได้ จึงต้องอัปโหลดเข้าระบบร้านก่อน)
 *
 * เพิ่มดาวน์เอง: ลูกค้ากรอกยอดดาวน์ที่ต้องการ (ดาวน์ของแผน – 50% ของราคา) → ค่างวดทุกช่วงคำนวณใหม่ทันที
 * ด้วยอัตราเดิมของแผน (lib/installment.ts#monthlyForDown) · ต้องมีราคาเครื่อง (price) ถึงจะเปิดให้เพิ่มดาวน์
 */
export default function InstallmentBox({ info, price, onConfirm }: {
  info: InstallmentInfo;
  price?: number | null;
  onConfirm: (sel: InstallmentSelection) => void;
}) {
  // แผนผ่อน: ใช้ plans ถ้ามี ไม่งั้น fallback แผนเดียวจาก field เก่า (back-compat)
  const plans: InstallmentPlanOption[] =
    info.plans && info.plans.length > 0
      ? info.plans
      : [{ label: null, down: info.downPayment, promo: info.note, terms: info.terms ?? [] }];

  const [planSel, setPlanSel] = useState(0);
  const [sel, setSel] = useState(0);
  const plan = plans[Math.min(planSel, plans.length - 1)];
  const terms = plan.terms ?? [];
  const term = terms[Math.min(sel, Math.max(0, terms.length - 1))];
  // ดาวน์ของแผน = ดาวน์เฉพาะงวดที่เลือก (ถ้าร้านตั้ง) ไม่งั้นดาวน์ของแผน
  const baseDownFor = (t: InstallmentTerm | undefined) => (t?.down != null ? t.down : plan.down);

  // ---- เพิ่มดาวน์เอง: desired = ยอดที่ลูกค้าขอ "ตามที่กรอก" (null = ดาวน์ปกติ) ใช้ร่วมทุกงวด/แผน ----
  // เก็บค่าที่ขอไว้ ไม่ใช่ค่าที่บีบแล้ว — งวดที่ดาวน์ของร้านต่างกัน (เช่น 10 ด. 11,900 · 18 ด. 9,900) ต่างคนต่างบีบเอง
  // ขอ 10,000 → 10 ด. ได้ 11,900 (ขั้นต่ำ) · สลับไป 18 ด. ได้ 10,000 ตามที่ขอ ไม่ตกกลับไป 9,900
  const [desired, setDesired] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");          // ข้อความระหว่างพิมพ์ (โฟกัสอยู่) — นอกนั้นช่องโชว์ดาวน์ที่ใช้จริงของงวดนี้
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const rangeFor = (t: InstallmentTerm | undefined) => downRange(price, baseDownFor(t));
  /** ดาวน์ + ค่างวดที่ใช้จริงของงวดนั้น (ดาวน์ปกติ = ค่าเดิมของร้านเป๊ะ) */
  const quoteFor = (t: InstallmentTerm | undefined) => {
    const base = baseDownFor(t);
    if (!t || base == null || price == null) return { down: base, monthly: t?.monthly ?? null };
    const d = effectiveDown(desired, rangeFor(t), base);
    return { down: d, monthly: monthlyForDown(t.monthly, price, base, d) };
  };

  const baseDown = baseDownFor(term);
  const range = rangeFor(term);
  const quote = quoteFor(term);
  const down = quote.down;
  const monthly = quote.monthly;
  const extra = baseDown != null && down != null ? down - baseDown : 0;
  const perMonthSaved = term && monthly != null ? term.monthly - monthly : 0;
  const totalSaved = term && baseDown != null && down != null && monthly != null
    ? (baseDown + term.monthly * term.months) - (down + monthly * term.months) : 0;

  const planLabel = (p: InstallmentPlanOption, i: number) =>
    p.label?.trim() || (p.down != null ? `ดาวน์ ${baht(p.down)}` : `แผน ${i + 1}`);

  const pickPlan = (i: number) => { setPlanSel(i); setSel(0); };   // เปลี่ยนแผน → รีเซ็ตงวดเป็นช่วงแรก

  /** ตั้งยอดดาวน์ที่ขอ (ปุ่ม/ช่องกรอก) — null = ดาวน์ปกติ · เกินเพดานเก็บเป็นเพดาน (เพดานเท่ากันทุกงวด = 50% ของราคา) */
  const applyDown = (v: number | null) => {
    if (!range || v == null || !Number.isFinite(v)) { setDesired(null); return; }
    setDesired(Math.min(range.max, Math.max(0, Math.round(v))));
  };
  const openEditor = () => setEditing(true);
  const typed = Number(draft.replace(/[^\d]/g, ""));
  const draftHint = !range || !focused || draft === "" ? null
    : typed < range.min ? `ดาวน์ขั้นต่ำ ${baht(range.min)}`
    : typed > range.max ? `ดาวน์ได้สูงสุด ${baht(range.max)} (50% ของราคาเครื่อง)`
    : null;

  const confirm = () => {
    // ลูกค้าเพิ่มดาวน์เอง → แนบแผนเดิมของร้านไว้หน้าสุด (แอดมินเห็นที่มาของตัวเลข · ตัด 100 ตัวไม่หาย)
    const custom = extra > 0 && term && baseDown != null
      ? `ดาวน์เพิ่มเอง (แผนร้าน ดาวน์ ${baht(baseDown)} · ${baht(term.monthly)}x${term.months}ด.)` : null;
    const label = [custom, plans.length > 1 ? planLabel(plan, planSel) : null, plan.promo].filter(Boolean).join(" · ");
    onConfirm({
      planLabel: label ? label.slice(0, 100) : null,
      downPayment: down ?? null,
      months: term?.months ?? null,
      monthly: monthly ?? null,
    });
  };

  return (
    <div id="installment-box" className="mt-5 scroll-mt-24 overflow-hidden rounded-2xl border border-yellow/40 bg-gradient-to-b from-yellow/10 to-white">
      <div className="flex items-center gap-2 border-b border-yellow/30 bg-yellow/15 px-5 py-3">
        <CreditCard size={18} className="text-yellow-hover" />
        <span className="font-bold text-text-heading">ผ่อนผ่านเว็บ — แนบบัตรประชาชน แล้วส่งเข้า LINE</span>
      </div>

      <div className="p-5">
        {/* เลือกแผนผ่อน (ถ้ามีหลายแผน) — ตั้งจากร้าน (Stock) */}
        {plans.length > 1 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold text-text-heading">เลือกแผนผ่อน</p>
            <div className="flex flex-wrap gap-2">
              {plans.map((p, i) => (
                <button
                  key={i}
                  onClick={() => pickPlan(i)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    i === planSel ? "border-yellow bg-yellow/15 ring-2 ring-yellow text-text-heading" : "border-border-default text-text-body hover:border-text-muted"
                  }`}
                >
                  {planLabel(p, i)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ดาวน์ | ค่างวด — 2 การ์ดเท่ากัน โครง 3 แถวเหมือนกัน (หัวข้อ · ตัวเลข · บรรทัดรอง) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col rounded-2xl border border-border-default bg-white p-3.5 sm:p-4">
            <p className="text-xs font-medium text-text-muted">เงินดาวน์</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-price md:text-3xl">{baht(down)}</p>
            <div className="mt-2 flex min-h-8 items-center">
              {range ? (
                <button
                  type="button"
                  onClick={() => (editing ? setEditing(false) : openEditor())}
                  aria-expanded={editing}
                  aria-controls={`${inputId}-panel`}
                  className={`inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition ${
                    editing || extra > 0
                      ? "border-yellow bg-yellow/20 text-text-heading"
                      : "border-yellow/60 bg-white text-yellow-text hover:border-yellow hover:bg-yellow/10"
                  }`}
                >
                  {editing ? <ChevronUp size={13} /> : extra > 0 ? <Pencil size={12} /> : <Plus size={13} />}
                  {editing ? "เสร็จ" : extra > 0 ? `ปกติ ${baht(baseDown)}` : "เพิ่มดาวน์"}
                </button>
              ) : (
                <span className="text-xs text-text-muted">ดาวน์ขั้นต่ำของแผน</span>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-border-default bg-white p-3.5 sm:p-4">
            <p className="text-xs font-medium text-text-muted">ค่างวด / เดือน</p>
            {term && monthly != null ? (
              <p className="mt-1 text-2xl font-bold tabular-nums text-price md:text-3xl">{baht(monthly)}</p>
            ) : (
              <p className="mt-1 text-lg font-semibold text-text-muted">สอบถามแอดมิน</p>
            )}
            <div className="mt-2 flex min-h-8 items-center">
              {term && (perMonthSaved > 0 ? (
                <span className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-full bg-success-bg px-3 text-xs font-semibold text-success-text">
                  <TrendingDown size={13} /> ลดลง {baht(perMonthSaved)}
                </span>
              ) : (
                <span className="inline-flex min-h-8 items-center whitespace-nowrap rounded-full bg-bg-subtle px-3 text-xs font-semibold text-text-body">
                  × {term.months} เดือน
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* แผงกรอกดาวน์ที่ต้องการ */}
        <AnimatePresence initial={false}>
          {editing && range && (
            <motion.div
              id={`${inputId}-panel`}
              key="down-editor"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-2xl border border-yellow/50 bg-white p-4 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.18)]">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={inputId} className="text-sm font-bold text-text-heading">ดาวน์ที่ต้องการ</label>
                  <span className="text-[11px] tabular-nums text-text-muted">{baht(range.min)} – {baht(range.max)}</span>
                </div>

                {/* − [ ฿ ยอด ] + — ปุ่มสองข้างขนาดเท่ากัน ช่องกลางตัวเลขใหญ่ */}
                <div className="mt-3 grid grid-cols-[48px_1fr_48px] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyDown(stepDown(down ?? range.min, -1, range))}
                    disabled={(down ?? range.min) <= range.min}
                    aria-label="ลดเงินดาวน์ 500 บาท"
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-white text-text-heading transition hover:border-yellow hover:bg-yellow/10"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-text-muted">฿</span>
                    <input
                      id={inputId}
                      inputMode="numeric"
                      autoComplete="off"
                      value={focused ? draft : down != null ? fmt(down) : ""}
                      onFocus={(e) => { setDraft(down != null ? fmt(down) : ""); setFocused(true); e.target.select(); }}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 7);
                        setDraft(digits ? fmt(Number(digits)) : "");
                        // คำนวณสดเมื่ออยู่ในช่วง · นอกช่วง (กำลังพิมพ์ "5" → "5000") รอบีบตอนออกจากช่อง
                        const n = Number(digits);
                        if (digits && n >= range.min && n <= range.max) setDesired(n);
                      }}
                      onBlur={() => { setFocused(false); applyDown(draft === "" ? null : typed); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      aria-describedby={`${inputId}-hint`}
                      aria-invalid={!!draftHint}
                      className="h-12 w-full rounded-xl border border-border-default bg-white pl-9 pr-4 text-center text-2xl font-bold tabular-nums text-text-heading transition focus:border-yellow focus:shadow-[0_0_0_3px_rgba(255,212,0,0.25)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyDown(stepDown(down ?? range.min, 1, range))}
                    disabled={(down ?? range.min) >= range.max}
                    aria-label="เพิ่มเงินดาวน์ 500 บาท"
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-white text-text-heading transition hover:border-yellow hover:bg-yellow/10"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* ปุ่มลัด — กริดเท่ากันทุกช่อง */}
                {(() => {
                  const qs = quickDowns(range);
                  return (
                    <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${qs.length}, minmax(0, 1fr))` }}>
                      {qs.map((v, i) => {
                        const active = down === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => applyDown(i === 0 ? null : v)}
                            aria-pressed={active}
                            className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition ${
                              active ? "border-yellow bg-yellow/15 ring-2 ring-yellow" : "border-border-default hover:border-text-muted"
                            }`}
                          >
                            <span className="text-[10px] leading-tight text-text-muted">
                              {i === 0 ? "ดาวน์ปกติ" : i === qs.length - 1 ? "สูงสุด" : "ดาวน์"}
                            </span>
                            <span className="text-xs font-bold tabular-nums leading-tight text-text-heading sm:text-sm">{fmt(v)}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                <p id={`${inputId}-hint`} aria-live="polite" className={`mt-3 text-center text-xs ${draftHint ? "font-semibold text-price" : "text-text-muted"}`}>
                  {draftHint ?? (totalSaved > 0
                    ? <>จ่ายรวมทั้งสัญญาน้อยลง <span className="font-bold text-success-text">{baht(totalSaved)}</span> เมื่อเทียบกับดาวน์ปกติ</>
                    : "ยิ่งดาวน์มาก ค่างวดยิ่งเบา — คำนวณให้ทันทีทุกจำนวนงวด")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* สรุปแผนผ่อนของเครื่องนี้ (ชัดเจน) */}
        {term && monthly != null && (
          <div className="mt-3 rounded-xl bg-yellow/15 px-4 py-2.5 text-center text-sm font-semibold text-text-heading">
            เครื่องนี้ดาวน์ <span className="whitespace-nowrap text-price">{baht(down)}</span> แล้วผ่อนสบาย{" "}
            <span className="whitespace-nowrap"><span className="text-price">{baht(monthly)}</span> × {term.months} เดือน</span>
            {extra > 0 && <span className="mt-0.5 block text-[11px] font-medium text-text-muted">ค่างวดคำนวณอัตโนมัติตามแผนของร้าน · แอดมินยืนยันยอดจริงอีกครั้งในแชท</span>}
          </div>
        )}

        {/* เลือกจำนวนงวด (ถ้ามีหลายช่วง) */}
        {terms.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-text-heading">เลือกจำนวนงวด</p>
            <div className="flex flex-wrap gap-2">
              {terms.map((t, i) => {
                // ค่างวดของงวดนั้นตามดาวน์ที่ลูกค้าเลือก · ดาวน์ต่างจากที่โชว์อยู่ (ร้านตั้งดาวน์รายงวด) → บอกไว้ในปุ่ม
                const q = quoteFor(t);
                return (
                  <button
                    key={i}
                    onClick={() => setSel(i)}
                    className={`rounded-xl border px-3 py-2 text-sm tabular-nums transition ${
                      i === sel ? "border-yellow ring-2 ring-yellow text-text-heading" : "border-border-default text-text-body hover:border-text-muted"
                    }`}
                  >
                    {t.months} เดือน · {baht(q.monthly)}
                    {q.down != null && q.down !== down && (
                      <span className="ml-1 text-xs text-text-muted">· ดาวน์ {baht(q.down)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* โปรโมชันพิเศษ (ของแผนที่เลือก) */}
        {plan.promo && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-700">
            <Sparkles size={16} className="flex-shrink-0" /> {plan.promo}
          </div>
        )}

        {/* เอกสารที่ใช้ + จุดเด่น */}
        <div className="mt-4 rounded-xl border border-border-default bg-white p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text-heading">
            <FileText size={15} className="text-yellow-hover" /> เอกสารที่ใช้ผ่อน
          </p>
          <p className="flex items-center gap-2 text-sm text-text-body">
            <IdCard size={18} className="flex-shrink-0 text-success-text" /> ใช้<span className="font-bold text-text-heading">บัตรประชาชนใบเดียว</span>เท่านั้น
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {["อนุมัติไวใน 1 วัน", "ไม่ต้องใช้บัตรเครดิต", "อาชีพไหนก็ผ่อนได้"].map((b) => (
              <span key={b} className="inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2.5 py-1 text-[11px] font-medium text-text-body">
                <CheckCircle2 size={11} className="text-success-text" /> {b}
              </span>
            ))}
          </div>
        </div>

        <button type="button" onClick={confirm} className="btn-primary mt-5 w-full py-3.5 text-base">
          ยืนยันผ่อนเครื่องนี้ <ArrowRight size={18} />
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-text-muted">
          <IdCard size={13} /> แนบรูปบัตรประชาชน → ส่งข้อมูล → เปิดแชท LINE พร้อมเลขอ้างอิง
        </p>
      </div>
    </div>
  );
}
