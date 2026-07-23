"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Sparkles, RotateCcw, Banknote, Repeat, ArrowRight, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import { LINE_URL } from "@/lib/contact";
import { useEscapeKey } from "@/lib/useEscapeKey";

/**
 * ป๊อปอัพคัดกรอง "บริการที่สนใจ" ตอนเข้าเว็บครั้งแรก (มือถือ + คอม) — พาผู้ใช้ไป flow ที่ใช่
 * โจทย์คือ routing ไม่ใช่ลงทะเบียน: ผ่อน → หน้าสินค้าที่กรองแล้ว · บริการปรึกษา → LINE
 * แสดงครั้งเดียวตลอด (localStorage) · ปิด/ข้าม/เลือก ล้วนถือว่า "เห็นแล้ว" (ไม่ตื๊อซ้ำ)
 */
const SEEN_KEY = "dd_intent_v1";

type Action = { type: "route"; href: string } | { type: "line" };
interface Option { key: string; label: string; desc: string; icon: LucideIcon; action: Action; }

const OPTIONS: Option[] = [
  { key: "new",   label: "ผ่อนสินค้ามือ 1",    desc: "เครื่องใหม่ ประกันศูนย์ไทย",  icon: Sparkles,  action: { type: "route", href: "/products?condition=NEW" } },
  { key: "used",  label: "ผ่อนสินค้ามือ 2",    desc: "เครื่องมือสอง ตรวจสภาพแล้ว",  icon: RotateCcw, action: { type: "route", href: "/products?condition=SECOND_HAND" } },
  { key: "cash",  label: "แลกเงิน",           desc: "ไอโฟนแลกเงิน ได้เงินไว",      icon: Banknote,  action: { type: "line" } },
  { key: "trade", label: "เทิร์นเก่าแลกใหม่",  desc: "นำเครื่องเดิมมาแลกรุ่นใหม่",   icon: Repeat,    action: { type: "line" } },
];

export function markIntentSeen() {
  try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* โหมดส่วนตัว/บล็อก storage → เงียบ */ }
}

function isSeen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return true; }   // บล็อก storage → ถือว่าเห็นแล้ว ไม่รบกวน
}

export default function IntentGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(false);   // ปิด/เลือกแล้วในเซสชันนี้
  const [selected, setSelected] = useState<string | null>(null);

  // defer ด้วย rAF (pattern เดียวกับ SpinWheel) — client-only + ไม่ setState sync ใน effect
  useEffect(() => { const f = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(f); }, []);

  // open เป็น derived state (ไม่ setState ใน effect) — โชว์ครั้งแรกสุดนอกหน้า admin
  const open = mounted && !closed && !pathname.startsWith("/admin") && !isSeen();

  const dismiss = () => { markIntentSeen(); setClosed(true); };
  useEscapeKey(open, dismiss);

  const confirm = () => {
    const opt = OPTIONS.find((o) => o.key === selected);
    markIntentSeen();
    setClosed(true);
    if (!opt) return;
    // เก็บสถิติดีมานด์ (fire-and-forget — ไม่บล็อกการพาไปหน้าถัดไป, ล้มก็ไม่กระทบ UX)
    api.post("/intent", { service: opt.key.toUpperCase() }).catch(() => {});
    if (opt.action.type === "route") router.push(opt.action.href);
    else window.open(LINE_URL, "_blank", "noopener,noreferrer");
  };

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="intent-title" onClick={dismiss}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl rounded-2xl border border-border-default bg-white p-6 shadow-[0_24px_60px_rgba(16,24,40,0.22)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={dismiss} aria-label="ปิด" className="modal-close"><X size={20} /></button>

        {/* หัวข้อ */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow text-on-yellow">
            <Store size={24} />
          </div>
          <h2 id="intent-title" className="text-2xl font-bold text-text-heading">สนใจบริการไหนเป็นพิเศษ?</h2>
          <p className="mt-1.5 text-sm text-text-muted">เลือกเพื่อให้เราพาไปหน้าที่ใช่ที่สุด · ข้ามได้ถ้าอยากดูเองก่อน</p>
        </div>

        {/* ตัวเลือกบริการ */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPTIONS.map((o, i) => {
            const active = selected === o.key;
            const Icon = o.icon;
            // ถ้าจำนวนเป็นคี่ ตัวสุดท้ายจัดกลางเต็มแถว (ตอนนี้ 4 ตัว = คู่ → 2×2 พอดี ไม่ต้องจัด)
            const centerLast = OPTIONS.length % 2 === 1 && i === OPTIONS.length - 1;
            return (
              <label
                key={o.key}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-all ${centerLast ? "sm:col-span-2 sm:mx-auto sm:w-1/2" : ""} ${
                  active ? "border-yellow bg-yellow/10 ring-1 ring-yellow" : "border-border-default hover:border-yellow hover:bg-bg-tinted"
                }`}
              >
                <input type="radio" name="intent" value={o.key} checked={active} onChange={() => setSelected(o.key)} className="sr-only" />
                {/* วงกลม radio */}
                <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${active ? "border-yellow-hover" : "border-border-default"}`}>
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-yellow-hover" />}
                </span>
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${active ? "bg-yellow/25 text-yellow-hover" : "bg-bg-subtle text-text-muted"}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-text-heading">{o.label}</span>
                  <span className="block truncate text-xs text-text-muted">{o.desc}</span>
                </span>
              </label>
            );
          })}
        </div>

        {/* ปุ่ม */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <button onClick={confirm} disabled={!selected} className="btn-primary w-full py-3.5 text-base disabled:opacity-50 sm:w-auto sm:px-10">
            ยืนยันและดำเนินการต่อ <ArrowRight size={18} />
          </button>
          <button onClick={dismiss} className="text-sm text-text-muted transition-colors hover:text-text-heading">ข้ามไปก่อน · ดูสินค้าเอง</button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
