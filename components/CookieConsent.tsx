"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, ShieldCheck, BarChart3, Megaphone, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCookieConsent } from "@/context/CookieConsentContext";
import { MAX_AGE_DAYS, type ConsentChoices } from "@/lib/cookieConsent";
import { useEscapeKey } from "@/lib/useEscapeKey";

/**
 * แบนเนอร์ขอความยินยอมคุกกี้ (ล่างจอ) + โมดัลตั้งค่ารายละเอียด — ตามแนวทาง PDPA/GDPR
 * • ยังไม่ตัดสินใจ → แสดงแบนเนอร์ (ไม่บล็อกทั้งจอ ให้ผู้ใช้อ่านเนื้อหาได้)
 * • "ตั้งค่า" → เปิดโมดัลเลือกรายหมวด · เปิดซ้ำได้จาก Footer "จัดการคุกกี้"
 * ไม่แสดงในหลังบ้าน /admin (แอดมินยินยอมผ่านการใช้งานระบบภายในอยู่แล้ว)
 */

interface CategoryMeta {
  key: "necessary" | "analytics" | "marketing";
  title: string;
  desc: string;
  icon: LucideIcon;
  locked?: boolean;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "necessary",
    title: "คุกกี้ที่จำเป็น",
    desc: "จำเป็นต่อการทำงานพื้นฐาน เช่น การเข้าสู่ระบบ ตะกร้าสินค้า และความปลอดภัย — เปิดใช้งานตลอดเวลา",
    icon: ShieldCheck,
    locked: true,
  },
  {
    key: "analytics",
    title: "คุกกี้เพื่อการวิเคราะห์",
    desc: "ช่วยให้เราเข้าใจว่าผู้ใช้ใช้งานเว็บไซต์อย่างไร เพื่อปรับปรุงประสบการณ์ให้ดียิ่งขึ้น",
    icon: BarChart3,
  },
  {
    key: "marketing",
    title: "คุกกี้เพื่อการตลาด",
    desc: "ใช้เพื่อแสดงโปรโมชันและเนื้อหาที่ตรงกับความสนใจของคุณทั้งบนเว็บไซต์และแพลตฟอร์มอื่น",
    icon: Megaphone,
  },
];

export default function CookieConsent() {
  const pathname = usePathname();
  const { hydrated, consent, prefsOpen, acceptAll, rejectAll, save, openPreferences, closePreferences } =
    useCookieConsent();
  const [mounted, setMounted] = useState(false);

  // defer ด้วย rAF (pattern เดียวกับ IntentGate) — client-only, กัน portal ยิงก่อน document พร้อม
  useEffect(() => {
    const f = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const onAdmin = pathname?.startsWith("/admin") ?? false;
  if (!mounted || !hydrated || onAdmin) return null;

  const showBanner = consent === null && !prefsOpen;

  return createPortal(
    <>
      <AnimatePresence>
        {showBanner && (
          <ConsentBanner
            onAcceptAll={acceptAll}
            onRejectAll={rejectAll}
            onManage={openPreferences}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {prefsOpen && (
          <PreferencesModal
            initial={{ analytics: consent?.analytics ?? false, marketing: consent?.marketing ?? false }}
            onSave={save}
            onAcceptAll={acceptAll}
            onClose={closePreferences}
          />
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}

/* ---------- แบนเนอร์ล่างจอ ---------- */
function ConsentBanner({
  onAcceptAll,
  onRejectAll,
  onManage,
}: {
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onManage: () => void;
}) {
  return (
    <motion.div
      role="dialog"
      aria-modal="false"
      aria-label="การตั้งค่าความเป็นส่วนตัวและคุกกี้"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 bottom-0 z-[95] px-3 pb-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-6 md:max-w-md md:px-0 md:pb-0"
    >
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border-default bg-white p-5 shadow-[0_16px_48px_rgba(16,24,40,0.18)] sm:p-6 md:mx-0 md:max-w-none">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow text-on-yellow">
            <Cookie size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-text-heading">เราใช้คุกกี้ 🍪</h2>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              เว็บไซต์นี้ใช้คุกกี้เพื่อให้ระบบทำงานได้อย่างสมบูรณ์ วิเคราะห์การใช้งาน และปรับปรุงประสบการณ์ของคุณ
              คุณสามารถเลือกยอมรับทั้งหมดหรือตั้งค่าเองได้ อ่านเพิ่มเติมที่{" "}
              <Link href="/privacy" className="font-medium text-yellow-hover underline-offset-2 hover:underline">
                นโยบายความเป็นส่วนตัว
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            onClick={onManage}
            className="btn-secondary order-3 w-full py-2.5 text-sm sm:order-1 sm:w-auto sm:px-5"
          >
            ตั้งค่า
          </button>
          <button
            onClick={onRejectAll}
            className="btn-secondary order-2 w-full py-2.5 text-sm sm:w-auto sm:px-5"
          >
            ปฏิเสธ
          </button>
          <button
            onClick={onAcceptAll}
            className="btn-primary order-1 w-full py-2.5 text-sm sm:order-3 sm:w-auto sm:px-6"
          >
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- โมดัลตั้งค่ารายหมวด ---------- */
function PreferencesModal({
  initial,
  onSave,
  onAcceptAll,
  onClose,
}: {
  initial: ConsentChoices;
  onSave: (choices: ConsentChoices) => void;
  onAcceptAll: () => void;
  onClose: () => void;
}) {
  const [choices, setChoices] = useState<ConsentChoices>(initial);
  useEscapeKey(true, onClose);

  const toggle = (key: "analytics" | "marketing") =>
    setChoices((c) => ({ ...c, [key]: !c[key] }));

  return (
    <motion.div
      className="modal-backdrop"
      style={{ zIndex: 1100 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-prefs-title"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative my-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border-default bg-white p-6 shadow-[0_24px_60px_rgba(16,24,40,0.22)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="ปิด" className="modal-close"><X size={20} /></button>

        <div className="mb-5 pr-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-yellow text-on-yellow">
            <Cookie size={22} />
          </div>
          <h2 id="cookie-prefs-title" className="text-xl font-bold text-text-heading">ตั้งค่าความเป็นส่วนตัว</h2>
          <p className="mt-1.5 text-sm text-text-muted">
            เลือกประเภทคุกกี้ที่ยินยอมให้เราใช้งาน คุณเปลี่ยนแปลงการตั้งค่านี้ได้ทุกเมื่อจากลิงก์ “จัดการคุกกี้” ด้านล่างเว็บไซต์
            · ดูรายละเอียดใน{" "}
            <Link href="/privacy" className="font-medium text-yellow-hover underline-offset-2 hover:underline">
              นโยบายความเป็นส่วนตัว
            </Link>
          </p>
        </div>

        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const on = cat.locked ? true : choices[cat.key as "analytics" | "marketing"];
            return (
              <div
                key={cat.key}
                className="flex items-start gap-3 rounded-2xl border border-border-default bg-bg-subtle p-4"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-text-muted">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-text-heading">{cat.title}</h3>
                    {cat.locked ? (
                      <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-xs font-medium text-success-text">
                        <Check size={13} /> เปิดเสมอ
                      </span>
                    ) : (
                      <ConsentToggle
                        checked={on}
                        label={cat.title}
                        onChange={() => toggle(cat.key as "analytics" | "marketing")}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{cat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-xs text-text-disabled">
          เราจะบันทึกการตั้งค่านี้ไว้ {MAX_AGE_DAYS} วัน แล้วจึงสอบถามใหม่อีกครั้ง
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button onClick={onAcceptAll} className="btn-primary w-full py-3 text-sm sm:flex-1">
            ยอมรับทั้งหมด
          </button>
          <button onClick={() => onSave(choices)} className="btn-secondary w-full py-3 text-sm sm:flex-1">
            บันทึกการตั้งค่า
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- สวิตช์เปิด/ปิด (a11y: role=switch) ---------- */
function ConsentToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-yellow" : "bg-border-default"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
