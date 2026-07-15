"use client";
import { useEffect } from "react";

/**
 * เรียก onEscape เมื่อกดปุ่ม Esc — ใช้กับโมดัล/ดรอปดาวน์ให้ปิดได้ด้วยคีย์บอร์ด (a11y)
 * ทำงานเฉพาะตอน active = true (เช่น โมดัลเปิดอยู่) เพื่อไม่ให้ผูก listener ค้างไว้
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}
