"use client";
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import {
  ACCEPT_ALL, REJECT_ALL,
  readConsent, writeConsent,
  type ConsentChoices, type StoredConsent,
} from "@/lib/cookieConsent";

interface CookieConsentValue {
  /** อ่านค่าจาก storage เสร็จแล้วหรือยัง — กัน hydration mismatch (SSR ไม่รู้ค่า) */
  hydrated: boolean;
  /** ตัดสินใจไปแล้วหรือยัง (null = ยังไม่เคยเลือก → โชว์แบนเนอร์) */
  consent: StoredConsent | null;
  /** เปิดโมดัลตั้งค่ารายละเอียดอยู่ไหม */
  prefsOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (choices: ConsentChoices) => void;
  openPreferences: () => void;
  closePreferences: () => void;
}

const CookieConsentContext = createContext<CookieConsentValue | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [consent, setConsent] = useState<StoredConsent | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  // อ่านค่าเดิมหลัง mount (client-only) + sync ข้ามแท็บ
  // defer ด้วย rAF (pattern เดียวกับ IntentGate) — เลี่ยง setState ตรง ๆ ใน effect ที่ทำ cascading render
  useEffect(() => {
    const f = requestAnimationFrame(() => {
      setConsent(readConsent());
      setHydrated(true);
    });
    const onStorage = () => setConsent(readConsent());
    window.addEventListener("storage", onStorage);
    return () => {
      cancelAnimationFrame(f);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const save = useCallback((choices: ConsentChoices) => {
    setConsent(writeConsent(choices));
    setPrefsOpen(false);
  }, []);

  const acceptAll = useCallback(() => save(ACCEPT_ALL), [save]);
  const rejectAll = useCallback(() => save(REJECT_ALL), [save]);
  const openPreferences = useCallback(() => setPrefsOpen(true), []);
  const closePreferences = useCallback(() => setPrefsOpen(false), []);

  const value = useMemo<CookieConsentValue>(
    () => ({ hydrated, consent, prefsOpen, acceptAll, rejectAll, save, openPreferences, closePreferences }),
    [hydrated, consent, prefsOpen, acceptAll, rejectAll, save, openPreferences, closePreferences],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error("useCookieConsent ต้องอยู่ภายใน <CookieConsentProvider>");
  return ctx;
}
