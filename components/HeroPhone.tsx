"use client";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, useReducedMotion } from "framer-motion";
import { Sparkles, Truck, ShieldCheck } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Hero โทรศัพท์ — ลอยขึ้นลงนุ่ม ๆ + เอียง 3D ตามเมาส์ (เดสก์ท็อป) + ป้ายลอยรอบเครื่อง + เงาหายใจ
 * เคารพ prefers-reduced-motion (ปิดการเคลื่อนไหวทั้งหมด) · มือถือลอยเฉย ๆ (ไม่เอียงตามเมาส์)
 */
export default function HeroPhone() {
  const reduce = useReducedMotion();

  // ตำแหน่งเมาส์ (-0.5..0.5) → เอียง 3D (spring ให้นุ่ม) — ±10° หรูกว่า ±13°
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [10, -10]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  // แสงสะท้อน (specular) วิ่งตามการเอียง — ให้รู้สึกเป็นวัตถุจริงมีผิวมัน
  const glareX = useTransform(sx, [-0.5, 0.5], [30, 70]);
  const glareY = useTransform(sy, [-0.5, 0.5], [30, 70]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.45), transparent 55%)`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const handleLeave = () => { mx.set(0); my.set(0); };

  const loop = { duration: 6, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <div
      className="relative flex min-h-[340px] items-center justify-center md:min-h-[460px]"
      style={{ perspective: 1100 }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="absolute h-64 w-64 rounded-full bg-yellow/25 blur-3xl md:h-80 md:w-80" aria-hidden="true" />
      <div className="absolute inset-[8%] rounded-[2.5rem] border border-white/70 bg-white/20 shadow-[var(--glow-premium)] backdrop-blur-[1px]" aria-hidden="true" />
      <div className="absolute inset-x-[12%] top-[12%] h-px bg-gradient-to-r from-transparent via-yellow/80 to-transparent" aria-hidden="true" />

      <Chip className="left-[0%] top-[14%]" delay={0} reduce={!!reduce}>
        <Sparkles size={13} className="text-success-text" /> มือ 1 ของแท้
      </Chip>
      <Chip className="right-[2%] top-[34%]" delay={0.7} reduce={!!reduce}>
        <Truck size={13} className="text-yellow-hover" /> ส่งด่วนทั่วไทย
      </Chip>
      <Chip className="bottom-[16%] left-[4%]" delay={1.2} reduce={!!reduce}>
        <ShieldCheck size={13} className="text-info-text" /> เครื่องแท้ 100%
      </Chip>

      <motion.div
        className="relative z-10 w-[68%] md:w-[80%]"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={reduce ? false : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div className="relative" style={{ translateZ: 50 }} animate={reduce ? undefined : { y: [0, -14, 0] }} transition={loop}>
          <Image
            src="/images/iphone-17-promax-orange.png"
            alt="iPhone 17 Pro Max"
            width={420}
            height={520}
            priority
            sizes="(max-width: 768px) 68vw, 40vw"
            className="w-full object-contain drop-shadow-2xl"
          />
          {/* specular glare — เลเยอร์แสงบาง ๆ วิ่งตามการเอียง (เดสก์ท็อป) */}
          {!reduce && (
            <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block" style={{ background: glareBg, mixBlendMode: "screen" }} />
          )}
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute bottom-[8%] h-4 w-1/2 rounded-[50%] bg-black/30 blur-md md:h-5"
        animate={reduce ? undefined : { scaleX: [1, 0.82, 1], opacity: [0.18, 0.09, 0.18] }}
        transition={loop}
        style={{ opacity: 0.16 }}
      />
    </div>
  );
}

function Chip({ className, children, delay, reduce }: { className: string; children: ReactNode; delay: number; reduce: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute z-20 hidden items-center gap-1.5 rounded-xl border border-border-default bg-white px-3 py-1.5 text-xs font-semibold text-text-heading shadow-lg sm:flex ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.8, y: 8 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
