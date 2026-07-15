"use client";
import { useEffect, useRef, useState } from "react";

/**
 * นับเลขขึ้นแบบ ease-out (requestAnimationFrame)
 * เริ่มนับเมื่อ element เข้าจอ (Intersection Observer) + เคารพ prefers-reduced-motion
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
  const [display, setDisplay] = useState(0);
  const started = useRef(false);   // เริ่มนับแล้วหรือยัง (ครั้งแรกตอนเข้าจอ)
  const from = useRef(0);          // ค่าเริ่มของรอบนับปัจจุบัน (เพื่อ tween จากเลขเดิม → เลขใหม่)

  // value เปลี่ยนหลังเริ่มนับแล้ว (เช่นสลับสี/ความจุในหน้าสินค้า) → นับใหม่จากเลขที่โชว์อยู่ ไม่ค้างเลขเดิม
  useEffect(() => {
    if (!started.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }
    from.current = display;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = requestAnimationFrame(function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from.current + (value - from.current) * easeOutCubic(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      let raf = 0;
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setDisplay(Math.round(easeOutCubic(p) * value));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { run(); io.unobserve(e.target); } }),
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  );
}
