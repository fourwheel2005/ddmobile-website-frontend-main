"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import SpinWheel from "@/components/SpinWheel";

interface Status {
  canSpin: boolean;
  percent: number | null;
  code: string | null;
  expiresAt: string | null;
  segments: number[];
}

/**
 * เปิดวงล้อต้อนรับให้ลูกค้าที่ล็อกอินและยังไม่เคยหมุน (อัตโนมัติครั้งแรกต่อ session)
 * - server เป็นคนบอกว่าหมุนได้ไหม (canSpin) — ไม่เชื่อ client
 * - กันเด้งซ้ำทุกหน้า: จำใน sessionStorage
 */
export default function WelcomeWheelGate() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const user = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!user) return;

    let cancel = false;
    api.get("/spin/status")
      .then((r) => {
        if (cancel) return;
        const s: Status = r.data;
        setStatus(s);
        if (s.canSpin && sessionStorage.getItem("welcomeWheelSeen") !== "1") {
          setOpen(true);
          sessionStorage.setItem("welcomeWheelSeen", "1");
        }
      })
      .catch(() => { /* ไม่ล็อกอิน/ผิดพลาด → เงียบ */ });
    return () => { cancel = true; };
  }, [pathname]);

  if (!open || !status) return null;
  return <SpinWheel segments={status.segments} onClose={() => setOpen(false)} />;
}
