"use client";
import { Cookie } from "lucide-react";
import { useCookieConsent } from "@/context/CookieConsentContext";

/**
 * ปุ่มเปิดโมดัลตั้งค่าคุกกี้ซ้ำ — ใช้ในหน้า /privacy (server component เรียก client ตรง ๆ ไม่ได้)
 * className ปล่อยให้ผู้เรียกกำหนด เพื่อนำไปวางได้หลายบริบท
 */
export default function CookieSettingsButton({ className }: { className?: string }) {
  const { openPreferences } = useCookieConsent();
  return (
    <button type="button" onClick={openPreferences} className={className ?? "btn-secondary"}>
      <Cookie size={18} /> จัดการการตั้งค่าคุกกี้
    </button>
  );
}
