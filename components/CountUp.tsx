"use client";
import { useEffect, useRef, useState } from "react";

/**
 * นับเลขขึ้นแบบ ease-out เมื่อค่ามีการเปลี่ยน เช่น ผู้ใช้เลือกสีหรือความจุอื่น
 * ราคาต้องแสดงค่าจริงตั้งแต่ first paint เพื่อไม่ให้เกิดการเห็น "฿0" ชั่วคราว
 */
export default function CountUp({
  value,
  duration = 900,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const previousValue = useRef(value);
  const mounted = useRef(false);

  // ไม่ animate ตอน mount; animate เฉพาะเมื่อ value เปลี่ยนหลังผู้ใช้เลือก option ใหม่
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      previousValue.current = value;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }
    const from = previousValue.current;
    previousValue.current = value;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (value - from) * easeOutCubic(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
