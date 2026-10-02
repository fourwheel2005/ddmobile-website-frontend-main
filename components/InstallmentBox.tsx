"use client";
import { useState } from "react";
import { Sparkles, CreditCard, FileText, CheckCircle2, IdCard, ArrowRight } from "lucide-react";

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

/**
 * กล่องผ่อน: แสดง เงินดาวน์ + ค่างวดต่อเดือน (เลือกแผน/จำนวนงวดได้)
 * ปุ่ม "ยืนยันผ่อนเครื่องนี้" → onConfirm(แผนที่เลือก) — หน้าสินค้าเปิดฟอร์มแนบบัตรประชาชน แล้วค่อยส่งเข้า LINE
 * (ลิงก์ LINE แนบรูปบัตรไม่ได้ จึงต้องอัปโหลดเข้าระบบร้านก่อน)
 */
export default function InstallmentBox({ info, onConfirm }: {
  info: InstallmentInfo;
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
  // ดาวน์ที่ใช้จริง = ดาวน์เฉพาะงวดที่เลือก (ถ้าร้านตั้ง) ไม่งั้นดาวน์ของแผน
  const downFor = (t: InstallmentTerm | undefined) => (t?.down != null ? t.down : plan.down);
  const down = downFor(term);
  const planLabel = (p: InstallmentPlanOption, i: number) =>
    p.label?.trim() || (p.down != null ? `ดาวน์ ${baht(p.down)}` : `แผน ${i + 1}`);

  const pickPlan = (i: number) => { setPlanSel(i); setSel(0); };   // เปลี่ยนแผน → รีเซ็ตงวดเป็นช่วงแรก

  const confirm = () => {
    const label = [plans.length > 1 ? planLabel(plan, planSel) : null, plan.promo].filter(Boolean).join(" · ");
    onConfirm({
      planLabel: label ? label.slice(0, 100) : null,
      downPayment: down ?? null,
      months: term?.months ?? null,
      monthly: term?.monthly ?? null,
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted">ราคาดาวน์</p>
            <p className="text-2xl font-bold text-price md:text-3xl">{baht(down)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">ราคาผ่อน</p>
            {term ? (
              <p className="text-2xl font-bold text-price md:text-3xl">
                {baht(term.monthly)} <span className="text-sm font-medium text-text-muted">x {term.months} ด.</span>
              </p>
            ) : (
              <p className="text-lg font-semibold text-text-muted">สอบถามแอดมิน</p>
            )}
          </div>
        </div>

        {/* สรุปแผนผ่อนของเครื่องนี้ (ชัดเจน) */}
        {term && (
          <div className="mt-3 rounded-xl bg-yellow/15 px-4 py-2.5 text-center text-sm font-semibold text-text-heading">
            เครื่องนี้ดาวน์ <span className="text-price">{baht(down)}</span> แล้วผ่อนสบาย <span className="text-price">{baht(term.monthly)}</span> × {term.months} เดือน
          </div>
        )}

        {/* เลือกจำนวนงวด (ถ้ามีหลายช่วง) */}
        {terms.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-text-heading">เลือกจำนวนงวด</p>
            <div className="flex flex-wrap gap-2">
              {terms.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSel(i)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    i === sel ? "border-yellow ring-2 ring-yellow text-text-heading" : "border-border-default text-text-body hover:border-text-muted"
                  }`}
                >
                  {t.months} เดือน · {baht(t.monthly)}
                  {t.down != null && t.down !== plan.down && (
                    <span className="ml-1 text-xs text-text-muted">· ดาวน์ {baht(t.down)}</span>
                  )}
                </button>
              ))}
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
