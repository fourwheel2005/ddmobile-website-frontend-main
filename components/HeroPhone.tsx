"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { MoveHorizontal, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import { useState, type KeyboardEvent, type ReactNode } from "react";

export type HeroPhoneView = "back" | "front";

const SWIPE_OFFSET_PX = 42;
const SWIPE_VELOCITY_PX = 420;

export function resolveHeroPhoneView(
  currentView: HeroPhoneView,
  offsetX: number,
  velocityX: number,
): HeroPhoneView {
  if (offsetX <= -SWIPE_OFFSET_PX || velocityX <= -SWIPE_VELOCITY_PX) return "front";
  if (offsetX >= SWIPE_OFFSET_PX || velocityX >= SWIPE_VELOCITY_PX) return "back";
  return currentView;
}

export default function HeroPhone() {
  const reduceMotion = useReducedMotion();
  const [activeView, setActiveView] = useState<HeroPhoneView>("front");
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 120, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [7, -7]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [-5, 5]);
  const glareX = useTransform(springX, [-0.5, 0.5], [32, 68]);
  const glareY = useTransform(springY, [-0.5, 0.5], [35, 65]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.38), transparent 52%)`;

  const selectView = (view: HeroPhoneView) => setActiveView(view);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    mouseY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    selectView(resolveHeroPhoneView(activeView, info.offset.x, info.velocity.x));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "Home") {
      event.preventDefault();
      selectView("back");
    }
    if (event.key === "ArrowRight" || event.key === "End") {
      event.preventDefault();
      selectView("front");
    }
  };

  const imageTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 190, damping: 22, mass: 0.8 };

  return (
    <div
      className="relative flex min-h-[410px] items-center justify-center overflow-hidden md:min-h-[470px]"
      style={{ perspective: 1100 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        aria-hidden="true"
        className="absolute h-[19rem] w-[19rem] rounded-full bg-[radial-gradient(circle,rgba(255,177,92,0.36)_0%,rgba(255,207,64,0.16)_48%,transparent_72%)] blur-xl md:h-[23rem] md:w-[23rem]"
      />
      <motion.div
        aria-hidden="true"
        className="absolute h-[72%] w-[82%] rounded-[50%] border border-yellow/35"
        animate={reduceMotion ? undefined : { rotate: [0, 2, 0], scale: [1, 1.025, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[15%] top-[13%] h-px bg-gradient-to-r from-transparent via-yellow/60 to-transparent"
      />

      <Chip className="left-[0%] top-[14%]" delay={0} reduceMotion={!!reduceMotion}>
        <Sparkles size={13} className="text-success-text" /> มือ 1 ของแท้
      </Chip>
      <Chip className="right-[1%] top-[33%]" delay={0.7} reduceMotion={!!reduceMotion}>
        <Truck size={13} className="text-yellow-hover" /> ส่งด่วนทั่วไทย
      </Chip>
      <Chip className="bottom-[18%] left-[2%]" delay={1.2} reduceMotion={!!reduceMotion}>
        <ShieldCheck size={13} className="text-info-text" /> เครื่องแท้ 100%
      </Chip>

      <motion.div
        className="relative z-10 h-[330px] w-[min(94vw,410px)] outline-none [touch-action:pan-y] focus-visible:rounded-[3rem] focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-4 md:h-[390px] md:w-[430px]"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        role="group"
        tabIndex={0}
        aria-label="ภาพ iPhone 17 Pro Max แบบสองมุม ใช้ปุ่มลูกศรซ้ายและขวาเพื่อเปลี่ยนมุม"
        onKeyDown={handleKeyDown}
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 0.985 }}
        >
          <motion.div
            className="absolute inset-0"
            animate={reduceMotion ? undefined : { y: [0, -9, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute left-1/2 top-1/2"
              animate={
                activeView === "back"
                  ? { x: "-79%", y: "-56%", scale: 1.02, rotateY: -7, rotateZ: -1, opacity: 1, zIndex: 2 }
                  : { x: "-92%", y: "-54%", scale: 0.89, rotateY: 7, rotateZ: -2.5, opacity: 0.76, zIndex: 1 }
              }
              transition={imageTransition}
            >
              <Image
                src="/images/iphone-17-promax-orange-back.webp"
                alt={activeView === "back" ? "iPhone 17 Pro Max สีส้ม มุมด้านหลัง" : ""}
                width={307}
                height={879}
                priority
                draggable={false}
                sizes="(max-width: 768px) 34vw, 180px"
                className="h-[292px] w-auto object-contain drop-shadow-[0_24px_22px_rgba(83,43,14,0.25)] md:h-[350px]"
              />
            </motion.div>

            <motion.div
              className="absolute left-1/2 top-1/2"
              animate={
                activeView === "front"
                  ? { x: "-21%", y: "-56%", scale: 1.02, rotateY: 7, rotateZ: 1, opacity: 1, zIndex: 2 }
                  : { x: "-8%", y: "-54%", scale: 0.89, rotateY: -7, rotateZ: 2.5, opacity: 0.76, zIndex: 1 }
              }
              transition={imageTransition}
            >
              <Image
                src="/images/iphone-17-promax-orange-front.webp"
                alt={activeView === "front" ? "iPhone 17 Pro Max สีส้ม มุมด้านหน้า" : ""}
                width={316}
                height={868}
                priority
                draggable={false}
                sizes="(max-width: 768px) 35vw, 185px"
                className="h-[288px] w-auto object-contain drop-shadow-[0_24px_22px_rgba(83,43,14,0.25)] md:h-[346px]"
              />
            </motion.div>
          </motion.div>

          {!reduceMotion && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[7%] rounded-[45%] mix-blend-screen"
              style={{ background: glareBackground }}
            />
          )}
        </motion.div>

        <motion.div
          aria-hidden="true"
          className="absolute bottom-4 left-1/2 h-4 w-[48%] -translate-x-1/2 rounded-[50%] bg-orange-950/25 blur-md"
          animate={reduceMotion ? undefined : { scaleX: [1, 0.88, 1], opacity: [0.2, 0.12, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="absolute bottom-2 z-20 flex flex-col items-center gap-2 md:bottom-3">
        <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
          <MoveHorizontal size={15} aria-hidden="true" />
          ลากซ้าย–ขวาเพื่อเปลี่ยนมุม
        </p>
        <div className="flex rounded-full border border-border-default bg-white/90 p-1 shadow-sm backdrop-blur">
          <ViewButton
            active={activeView === "back"}
            label="ด้านหลัง"
            onClick={() => selectView("back")}
          />
          <ViewButton
            active={activeView === "front"}
            label="ด้านหน้า"
            onClick={() => selectView("front")}
          />
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        กำลังแสดงมุม{activeView === "front" ? "ด้านหน้า" : "ด้านหลัง"}
      </span>
    </div>
  );
}

function ViewButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 text-xs font-semibold transition-colors ${
        active ? "bg-text-heading text-white" : "text-text-muted hover:bg-bg-subtle hover:text-text-heading"
      }`}
    >
      {label}
    </button>
  );
}

function Chip({
  className,
  children,
  delay,
  reduceMotion,
}: {
  className: string;
  children: ReactNode;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute z-20 hidden items-center gap-1.5 rounded-xl border border-border-default bg-white px-3 py-1.5 text-xs font-semibold text-text-heading shadow-lg sm:flex ${className}`}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.8, y: 8 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 + delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
