"use client";
import { useState } from "react";
import { MessageCircle, Copy, Sparkles, CreditCard, FileText, CheckCircle2, IdCard } from "lucide-react";
import toast from "react-hot-toast";

export interface InstallmentTerm { months: number; monthly: number; }
export interface InstallmentInfo {
  kind: string;
  downPayment: number | null;
  terms: InstallmentTerm[];
  note: string | null;
}

interface ProductInfo {
  productName: string;
  sku?: string | null;
  serialOrImei?: string | null;
  color?: string | null;
  storage?: string | null;
  conditionLabel?: string | null;
  price?: number | null;
}

import { LINE_URL } from "@/lib/contact";
import { baht } from "@/lib/money";

/**
 * กล่องผ่อน + ปุ่มดึงเข้า LINE (เหมือนตัวอย่าง ufriend):
 * แสดง เงินดาวน์ + ค่างวดต่อเดือน (เลือกจำนวนงวดได้) แล้วปุ่มจะคัดลอกข้อมูลเครื่อง
 * ให้ลูกค้าวางในแชท LINE OA เพื่อให้แอดมินดำเนินการต่อ
 */
export default function InstallmentBox({ info, product }: { info: InstallmentInfo; product: ProductInfo }) {
  const terms = info.terms ?? [];
  const [sel, setSel] = useState(0);
  const term = terms[sel];

  const buildMessage = () => {
    const lines = [
      `สนใจผ่อน: ${product.productName}`,
      product.color ? `สี: ${product.color}` : null,
      product.storage ? `ความจุ: ${product.storage}` : null,
      product.conditionLabel ? `สภาพ: ${product.conditionLabel}` : null,
      product.serialOrImei ? `รหัส/IMEI: ${product.serialOrImei}` : (product.sku ? `SKU: ${product.sku}` : null),
      product.price != null ? `ราคาเครื่อง: ${baht(product.price)}` : null,
      info.downPayment != null ? `เงินดาวน์: ${baht(info.downPayment)}` : null,
      term ? `ผ่อน: ${baht(term.monthly)} x ${term.months} เดือน` : null,
      info.note ? `โปรโมชัน: ${info.note}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const goLine = async () => {
    const msg = buildMessage();
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("คัดลอกข้อมูลแล้ว — วางในแชท LINE ได้เลย", { duration: 4000 });
    } catch {
      toast("เปิด LINE แล้วพิมพ์สอบถามแอดมินได้เลย", { icon: "💬" });
    }
    window.open(LINE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-yellow/40 bg-gradient-to-b from-yellow/10 to-white">
      <div className="flex items-center gap-2 border-b border-yellow/30 bg-yellow/15 px-5 py-3">
        <CreditCard size={18} className="text-yellow-hover" />
        <span className="font-bold text-text-heading">ผ่อนผ่านเว็บ — ดึงเข้า LINE ต่อ</span>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted">ราคาดาวน์</p>
            <p className="text-2xl font-bold text-price md:text-3xl">{baht(info.downPayment)}</p>
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
            เครื่องนี้ดาวน์ <span className="text-price">{baht(info.downPayment)}</span> แล้วผ่อนสบาย <span className="text-price">{baht(term.monthly)}</span> × {term.months} เดือน
          </div>
        )}

        {/* เลือกจำนวนงวด (ถ้ามีหลายช่วง) */}
        {terms.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-text-heading">เลือกจำนวนงวด</p>
            <div className="flex flex-wrap gap-2">
              {terms.map((t, i) => (
                <button
                  key={t.months}
                  onClick={() => setSel(i)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    i === sel ? "border-yellow ring-2 ring-yellow text-text-heading" : "border-border-default text-text-body hover:border-text-muted"
                  }`}
                >
                  {t.months} เดือน · {baht(t.monthly)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* โปรโมชันพิเศษ */}
        {info.note && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-700">
            <Sparkles size={16} className="flex-shrink-0" /> {info.note}
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

        <button onClick={goLine} className="line-cta mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-line py-3.5 text-base font-bold text-white shadow-[var(--shadow-line)] transition-transform hover:-translate-y-0.5">
          <MessageCircle size={20} /> ยืนยันผ่อนเครื่องนี้ · ทักแอดมินทาง LINE
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-text-muted">
          <Copy size={12} /> กดแล้วระบบจะคัดลอกข้อมูลเครื่องให้ — วางส่งแอดมินใน LINE ได้เลย
        </p>
      </div>
    </div>
  );
}
