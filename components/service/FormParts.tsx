"use client";
import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { Choice } from "@/lib/tradeIn";

/* ---------- ชิ้นส่วนฟอร์มที่ใช้ร่วม (ขายเครื่อง / ผ่อนเครื่อง / ผ่อนบอลลูน) ---------- */

export function FormCard({ step, title, children }: { step: number; title: string; children: ReactNode }) {
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

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-text-heading">{label}</p>
      {children}
    </div>
  );
}

export function RadioCards({ options, value, onChange, cols, compact }: {
  options: Choice[]; value: string; onChange: (v: string) => void; cols: 2 | 3; compact?: boolean;
}) {
  const name = useId();   // radio group จริง (ลูกศรเลือกได้ + a11y)
  // compact (ความจุ) → flex-wrap: N ตัวเลือกแพ็กชิดซ้าย ไม่เหลือช่องกริดว่าง · label ไม่ตัดบรรทัด
  const wrap = compact ? "flex flex-wrap" : `grid ${cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`;
  return (
    <div className={`${wrap} gap-2`}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-yellow ${compact ? "flex-shrink-0" : ""} ${
              active ? "border-yellow bg-yellow/10 font-semibold text-text-heading ring-1 ring-yellow" : "border-border-default text-text-body hover:border-yellow hover:bg-bg-tinted"
            }`}
          >
            <input type="radio" name={name} checked={active} onChange={() => onChange(o.value)} className="sr-only" />
            <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${active ? "border-yellow-hover" : "border-border-default"}`}>
              {active && <span className="h-2.5 w-2.5 rounded-full bg-yellow-hover" />}
            </span>
            <span className={compact ? "whitespace-nowrap" : "min-w-0"}>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}

export function CheckCard({ label, checked, onChange, highlight }: { label: string; checked: boolean; onChange: () => void; highlight?: boolean }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-sm transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-yellow ${
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
