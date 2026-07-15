"use client";
import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, useReducedMotion } from "framer-motion";

/**
 * การ์ดเอียง 3D ตามเมาส์ + แสงวิ่ง (glare) — ใช้ห่อการ์ดสินค้า/สถิติให้ดูพรีเมียม
 * - เคารพ prefers-reduced-motion (ปิดสนิท คืน children เฉย ๆ)
 * - เอียงเฉพาะอุปกรณ์ที่มีเมาส์จริง (pointer: fine) — มือถือแตะไม่เอียง กันสะดุด
 * - ใช้ spring ให้นุ่ม + คืนตำแหน่งเมื่อเมาส์ออก
 * - transform ล้วน (ไม่กระทบ layout / ไม่เกิด CLS)
 */
export default function Tilt({
  children,
  className = "",
  max = 8,          // องศาเอียงสูงสุด
  scale = 1.02,     // ซูมเล็กน้อยตอน hover
  glare = true,     // แสงวิ่งตามเมาส์
  radius = 16,      // มุมโค้งของชั้น glare (ให้ตรงกับการ์ด)
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
  glare?: boolean;
  radius?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0.5);   // ตำแหน่งเมาส์ 0..1
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);  // 0 = ไม่ hover, 1 = hover (คุมความเข้ม glare)
  const spx = useSpring(px, { stiffness: 180, damping: 20 });
  const spy = useSpring(py, { stiffness: 180, damping: 20 });
  const sHover = useSpring(hover, { stiffness: 200, damping: 25 });

  const rotateY = useTransform(spx, [0, 1], [-max, max]);
  const rotateX = useTransform(spy, [0, 1], [max, -max]);
  const glareX = useTransform(spx, [0, 1], [0, 100]);
  const glareY = useTransform(spy, [0, 1], [0, 100]);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.4), transparent 50%)`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;   // มือถือ → ไม่เอียง
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onEnter = () => { if (!reduce) hover.set(1); };
  const onLeave = () => { px.set(0.5); py.set(0.5); hover.set(0); };

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      whileHover={{ scale }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={`relative ${className}`}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 900 }}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ borderRadius: radius, background: glareBg, opacity: sHover }}
        />
      )}
    </motion.div>
  );
}
