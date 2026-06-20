"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Banknote, CreditCard, Zap } from "lucide-react";

interface Slide {
  title: string;
  sub: string;
  cta: string;
  href: string;
  className: string;       // พื้นหลัง
  textClass: string;       // สีตัวอักษร
  icon: React.ReactNode;
}

const slides: Slide[] = [
  {
    title: "ดีลกลางปี ผ่อน iPhone 17",
    sub: "ดาวน์เริ่มต้น 0% · อนุมัติไวใน 1 วัน",
    cta: "ช้อปเลย",
    href: "/products",
    className: "bg-gradient-to-br from-yellow to-yellow-hover",
    textClass: "text-text-heading",
    icon: <Zap size={120} className="text-text-heading/10" />,
  },
  {
    title: "ไอโฟนแลกเงิน ได้เงินไว",
    sub: "วงเงินสูง ภายใน 1 วัน · ไม่ใช่การจำนำ",
    cta: "ดูรายละเอียด",
    href: "/contact",
    className: "bg-gradient-to-br from-[#1f2937] to-[#111827]",
    textClass: "text-white",
    icon: <Banknote size={120} className="text-white/10" />,
  },
  {
    title: "ผ่อนได้ ไม่ต้องใช้บัตรเครดิต",
    sub: "ใช้แค่บัตรประชาชนใบเดียว · ทุกอาชีพผ่อนได้",
    cta: "เริ่มผ่อน",
    href: "/installments",
    className: "bg-gradient-to-br from-[#0ea5e9] to-[#2563eb]",
    textClass: "text-white",
    icon: <CreditCard size={120} className="text-white/10" />,
  },
];

const AUTO_MS = 5000;

export default function PromoCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((i: number) => setIndex((i + slides.length) % slides.length), []);
  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  // เลื่อนอัตโนมัติ (หยุดเมื่อ hover/แตะ หรือ reduced-motion)
  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTO_MS);
    return () => clearInterval(t);
  }, [paused]);

  // swipe บนมือถือ
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  return (
    <div
      className="container-dd pt-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative overflow-hidden rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="โปรโมชัน"
      >
        {/* track */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div key={i} className={`relative flex min-w-full items-center overflow-hidden p-6 md:p-12 ${s.className}`} aria-hidden={i !== index}>
              <div className="pointer-events-none absolute -right-2 bottom-0 md:right-6">{s.icon}</div>
              <div className="relative z-10 max-w-[75%]">
                <h2 className={`text-xl font-bold md:text-3xl ${s.textClass}`}>{s.title}</h2>
                <p className={`mt-2 text-sm md:text-base ${s.textClass} opacity-80`}>{s.sub}</p>
                <Link
                  href={s.href}
                  tabIndex={i === index ? 0 : -1}
                  className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                    s.textClass === "text-white" ? "bg-white text-text-heading" : "bg-text-heading text-white"
                  }`}
                >
                  {s.cta} <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* arrows (desktop) */}
        <button onClick={prev} aria-label="ก่อนหน้า" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-text-heading shadow-card backdrop-blur transition hover:bg-white md:flex">
          <ChevronLeft size={20} />
        </button>
        <button onClick={next} aria-label="ถัดไป" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-text-heading shadow-card backdrop-blur transition hover:bg-white md:flex">
          <ChevronRight size={20} />
        </button>

        {/* dots */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`ไปสไลด์ที่ ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-text-heading" : "w-2 bg-text-heading/30 hover:bg-text-heading/50"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
