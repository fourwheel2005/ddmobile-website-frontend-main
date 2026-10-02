"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type PanInfo,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";
import { CreditCard, MoveHorizontal, ShieldCheck, Truck, Zap } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { INTENT_SEEN_EVENT, isIntentSeen } from "@/components/IntentGate";

export type HeroPhoneView = "back" | "front";
/** pending = ก่อนตัดสินใจ (SSR/ก่อน hydrate) · intro = motion เปิดตัว · idle = โต้ตอบได้ปกติ */
export type HeroIntroPhase = "pending" | "intro" | "idle";

const SWIPE_OFFSET_PX = 42;
const SWIPE_VELOCITY_PX = 420;

/** ความยาว motion เปิดตัวทั้งหมด (วินาที) */
export const HERO_INTRO_SECONDS = 5.5;
/** ช่วงที่เครื่องเข้าเวทีและจัดวาง (ที่เหลือคือป้าย/ปุ่มทยอยขึ้นแล้วนิ่ง) */
const PHONES_SECONDS = 3.6;
/** ป้ายข้อดีเริ่มขึ้น / ปุ่มเลือกมุมขึ้น (วินาทีจากเริ่ม intro) */
const CHIPS_AT_SECONDS = PHONES_SECONDS;
const CONTROLS_AT_SECONDS = 4.4;
export const HERO_INTRO_STORAGE_KEY = "dd-hero-intro-v1";

let introClaimedThisDocument = false;

/**
 * เล่น motion เปิดตัว "ครั้งแรกของแท็บ" เท่านั้น — กลับมาหน้าแรกซ้ำ/รีเฟรชในแท็บเดิมจะไม่เล่นอีก
 * storage ใช้ไม่ได้ (private mode) → ยึด flag ของเอกสารแทน (เล่นครั้งเดียวต่อการโหลดหน้า)
 */
export function claimHeroIntro(storage: Pick<Storage, "getItem" | "setItem"> | null): boolean {
  if (introClaimedThisDocument) return false;
  introClaimedThisDocument = true;
  try {
    if (storage?.getItem(HERO_INTRO_STORAGE_KEY) === "1") return false;
    storage?.setItem(HERO_INTRO_STORAGE_KEY, "1");
  } catch {
    /* storage ถูกปิด — ใช้ flag ของเอกสารแทน */
  }
  return true;
}

export function resolveHeroPhoneView(
  currentView: HeroPhoneView,
  offsetX: number,
  velocityX: number,
): HeroPhoneView {
  if (offsetX <= -SWIPE_OFFSET_PX || velocityX <= -SWIPE_VELOCITY_PX) return "front";
  if (offsetX >= SWIPE_OFFSET_PX || velocityX >= SWIPE_VELOCITY_PX) return "back";
  return currentView;
}

// ---------- ท่าทางของเครื่อง (ค่าเดียวกับเวอร์ชันเดิม — หลัง intro จบหน้าตาเหมือนเดิม) ----------

const BRIGHT = "brightness(1)";
const BACK_ACTIVE = { x: "-79%", y: "-56%", scale: 1.02, rotateY: -7, rotateZ: -1, opacity: 1, zIndex: 2, filter: BRIGHT };
const BACK_REST = { x: "-92%", y: "-54%", scale: 0.89, rotateY: 7, rotateZ: -2.5, opacity: 0.76, zIndex: 1, filter: BRIGHT };
const FRONT_ACTIVE = { x: "-21%", y: "-56%", scale: 1.02, rotateY: 7, rotateZ: 1, opacity: 1, zIndex: 2, filter: BRIGHT };
const FRONT_REST = { x: "-8%", y: "-54%", scale: 0.89, rotateY: -7, rotateZ: 2.5, opacity: 0.76, zIndex: 1, filter: BRIGHT };

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/*
 * Storyboard (5.5 วิ)
 * 0.0–1.0  แสงฟุ้งสว่างขึ้น · ด้านหลังลอยขึ้นกลางเวที
 * 1.0–2.4  หมุนช้าโชว์ชุดกล้อง · แสงกวาดผ่านตัวเครื่อง
 * 2.4–3.6  ด้านหลังถอยไปซ้าย · ด้านหน้าสไลด์เข้าพร้อมจอสว่าง
 * 3.6–4.4  ป้ายข้อดีทยอยขึ้น สลับซ้าย-ขวา
 * 4.4–5.5  ปุ่มเลือกมุมขึ้น แล้วทุกอย่างนิ่ง → โต้ตอบได้
 */
const BACK_INTRO: TargetAndTransition = {
  x: ["-50%", "-50%", "-52%", BACK_REST.x],
  y: ["-28%", "-56%", "-57%", BACK_REST.y],
  scale: [0.92, 1.06, 1.06, BACK_REST.scale],
  rotateY: [-32, -24, 12, BACK_REST.rotateY],
  rotateZ: [0, 0, -1, BACK_REST.rotateZ],
  opacity: [0, 1, 1, BACK_REST.opacity],
  zIndex: 1,
  filter: BRIGHT,
  transition: { duration: PHONES_SECONDS, times: [0, 0.28, 0.67, 1], ease: ["easeOut", "easeInOut", "easeInOut"] },
};
// คีย์เฟรมแรกซ้ำ = "รอ" อยู่นอกเวทีจนถึง 2.4 วิ (ไม่พึ่ง delay ที่ framer อาจแสดงท่าเดิมระหว่างรอ)
const FRONT_INTRO: TargetAndTransition = {
  x: ["40%", "40%", FRONT_ACTIVE.x],
  y: ["-54%", "-54%", FRONT_ACTIVE.y],
  scale: [0.94, 0.94, FRONT_ACTIVE.scale],
  rotateY: [28, 28, FRONT_ACTIVE.rotateY],
  rotateZ: [4, 4, FRONT_ACTIVE.rotateZ],
  opacity: [0, 0, FRONT_ACTIVE.opacity],
  zIndex: 2,
  filter: ["brightness(0.35)", "brightness(0.35)", BRIGHT],
  transition: {
    duration: PHONES_SECONDS,
    times: [0, 0.667, 1],
    ease: ["linear", EASE_OUT],
    // จอสว่างตามหลังการเคลื่อนเล็กน้อย = ความรู้สึก "เปิดเครื่อง"
    filter: { duration: PHONES_SECONDS, times: [0, 0.75, 1], ease: ["linear", "easeOut"] },
  },
};

/** จุดขายที่หน้าเว็บประกาศอยู่แล้ว (steps/features ใน app/page.tsx) — ห้ามเพิ่มคำอ้างใหม่ที่ไม่มีหลักฐาน */
const CHIPS: { side: "left" | "right"; className: string; icon: ReactNode; label: string }[] = [
  { side: "left", className: "left-0 top-[15%]", icon: <ShieldCheck size={13} className="text-info-text" />, label: "เครื่องแท้แกะกล่อง" },
  { side: "right", className: "right-0 top-[15%]", icon: <Zap size={13} className="text-yellow-hover" />, label: "อนุมัติไวใน 24 ชม." },
  { side: "left", className: "bottom-[30%] left-0", icon: <CreditCard size={13} className="text-success-text" />, label: "ไม่ต้องมีบัตร" },
  { side: "right", className: "bottom-[30%] right-0", icon: <Truck size={13} className="text-yellow-hover" />, label: "ส่งด่วนทั่วไทย" },
];

export default function HeroPhone() {
  const reduceMotion = !!useReducedMotion();
  const [phase, setPhase] = useState<HeroIntroPhase>("pending");
  /** ขั้นของ intro: 0 = เครื่อง · 1 = ป้ายขึ้น · 2 = ปุ่มขึ้น (ข้าม intro → idle แสดงทุกอย่างทันที) */
  const [introStage, setIntroStage] = useState(0);
  const [activeView, setActiveView] = useState<HeroPhoneView>("front");
  const decided = useRef<boolean | null>(null);

  // ตัดสินหลัง hydrate (SSR เห็น pending เสมอ → ไม่มี hydration mismatch)
  // ref กัน StrictMode เรียก effect ซ้ำแล้วไปใช้ "สิทธิ์เล่นครั้งแรก" ทิ้ง
  useEffect(() => {
    if (reduceMotion) {
      setPhase("idle");
      return;
    }
    const start = () => {
      if (decided.current === null) {
        let storage: Storage | null = null;
        try { storage = window.sessionStorage; } catch { /* บาง browser โยน SecurityError ตอนแตะ storage */ }
        decided.current = claimHeroIntro(storage);
      }
      setPhase(decided.current ? "intro" : "idle");
    };
    // ป๊อปอัพ "สนใจบริการไหน" (IntentGate) จะเปิดทับครั้งแรกสุด → รอให้ปิดก่อน ไม่งั้น intro เล่นอยู่หลังฉากมืด
    if (decided.current !== null || isIntentSeen()) {
      start();
      return;
    }
    window.addEventListener(INTENT_SEEN_EVENT, start, { once: true });
    return () => window.removeEventListener(INTENT_SEEN_EVENT, start);
  }, [reduceMotion]);

  useEffect(() => {
    if (phase !== "intro") return;
    setIntroStage(0);
    const timers = [
      window.setTimeout(() => setIntroStage(1), CHIPS_AT_SECONDS * 1000),
      window.setTimeout(() => setIntroStage(2), CONTROLS_AT_SECONDS * 1000),
      window.setTimeout(() => setPhase("idle"), HERO_INTRO_SECONDS * 1000),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [phase]);

  // แตะ/โฟกัส/กดคีย์ระหว่าง intro → ข้ามไปสถานะโต้ตอบได้ทันที (ไม่บังคับดูจนจบ)
  const skipIntro = () => {
    if (phase === "intro") setPhase("idle");
  };

  const intro = phase === "intro";
  const animated = phase === "idle" && !reduceMotion;
  const chipsShown = phase === "idle" || (intro && introStage >= 1);
  const controlsShown = phase === "idle" || (intro && introStage >= 2);

  // ----- เอียงตามเมาส์ + แสงสะท้อน (เหมือนเดิม) -----
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 120, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [7, -7]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [-5, 5]);
  const glareX = useTransform(springX, [-0.5, 0.5], [32, 68]);
  const glareY = useTransform(springY, [-0.5, 0.5], [35, 65]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.38), transparent 52%)`;

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!animated) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    mouseY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setActiveView((view) => resolveHeroPhoneView(view, info.offset.x, info.velocity.x));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "Home") {
      event.preventDefault();
      setActiveView("back");
    }
    if (event.key === "ArrowRight" || event.key === "End") {
      event.preventDefault();
      setActiveView("front");
    }
  };

  const poseTransition: Transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 190, damping: 22, mass: 0.8 };
  const backPose = activeView === "back" ? BACK_ACTIVE : BACK_REST;
  const frontPose = activeView === "front" ? FRONT_ACTIVE : FRONT_REST;

  return (
    <div
      className="relative flex min-h-[410px] min-w-0 items-center justify-center overflow-hidden md:min-h-[470px]"
      style={{ perspective: 1100 }}
      data-hero-phase={phase}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerDownCapture={skipIntro}
      onFocusCapture={skipIntro}
      onKeyDownCapture={skipIntro}
    >
      {/* แสงฟุ้งหลังเครื่อง — จังหวะแรกของ intro */}
      <motion.div
        aria-hidden="true"
        className="absolute h-[72%] w-[54%] rounded-[46%] bg-[radial-gradient(ellipse_at_center,rgba(255,151,76,0.24)_0%,rgba(255,196,64,0.10)_44%,transparent_72%)] blur-2xl md:h-[76%] md:w-[58%]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase === "pending" ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
        transition={intro ? { duration: 1.2, ease: "easeOut" } : { duration: reduceMotion ? 0 : 0.6 }}
      />

      {CHIPS.map((chip, index) => (
        <Chip
          key={chip.label}
          className={chip.className}
          side={chip.side}
          show={chipsShown}
          delay={intro ? index * 0.2 : 0.2 + index * 0.08}
          reduceMotion={reduceMotion}
        >
          {chip.icon} {chip.label}
        </Chip>
      ))}

      <motion.div
        className="relative z-10 h-[330px] w-[min(94vw,410px)] outline-none [touch-action:pan-y] focus-visible:rounded-[3rem] focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-4 md:h-[390px] md:w-[430px]"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        role="group"
        tabIndex={0}
        aria-label="ภาพ iPhone 17 Pro Max สีส้ม แบบสองมุม ใช้ปุ่มลูกศรซ้ายและขวาเพื่อเปลี่ยนมุม"
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 24 }}
        animate={phase === "pending" ? { opacity: 0, y: 24 } : { opacity: 1, y: 0 }}
        // intro: เวทีโผล่ทันที เครื่องแต่ละตัวคุม opacity เอง · idle (เคยดูแล้ว): fade-in สั้นแบบเดิม
        transition={{ duration: intro || reduceMotion ? 0 : 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
          drag={animated ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 0.985 }}
        >
          <motion.div
            className="absolute inset-0"
            animate={animated ? { y: [0, -9, 0] } : { y: 0 }}
            transition={animated ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
          >
            <motion.div
              className="absolute left-1/2 top-1/2"
              data-hero-device="back"
              initial={false}
              animate={intro ? BACK_INTRO : backPose}
              transition={poseTransition}
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
              data-hero-device="front"
              initial={false}
              animate={intro ? FRONT_INTRO : frontPose}
              transition={poseTransition}
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

          {/* แสงกวาดผ่านตัวเครื่อง (intro 1.0–2.4 วิ) */}
          {intro && (
            <motion.span
              aria-hidden="true"
              data-hero-sweep
              className="pointer-events-none absolute inset-y-[6%] left-1/2 w-[34%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-soft-light blur-sm"
              initial={{ x: "-180%", opacity: 0 }}
              animate={{ x: ["-180%", "80%"], opacity: [0, 1, 1, 0] }}
              transition={{
                delay: 1.0,
                duration: 1.4,
                ease: "easeInOut",
                opacity: { delay: 1.0, duration: 1.4, times: [0, 0.2, 0.8, 1] },
              }}
            />
          )}

          {animated && (
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
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={
            animated
              ? { scaleX: [1, 0.88, 1], opacity: [0.2, 0.12, 0.2] }
              : phase === "pending"
                ? { opacity: 0, scaleX: 0.6 }
                : { opacity: 0.2, scaleX: 1 }
          }
          transition={
            animated
              ? { duration: 6, repeat: Infinity, ease: "easeInOut" }
              : { duration: intro ? 1.0 : 0, ease: "easeOut" }
          }
        />
      </motion.div>

      <motion.div
        className="absolute bottom-2 z-20 flex flex-col items-center gap-2 md:bottom-3"
        initial={{ opacity: 0, y: 8 }}
        animate={controlsShown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
      >
        <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
          <MoveHorizontal size={15} aria-hidden="true" />
          ลากซ้าย–ขวาเพื่อเปลี่ยนมุม
        </p>
        <div className="flex rounded-full border border-border-default bg-white/90 p-1 shadow-sm backdrop-blur">
          <ViewButton active={activeView === "back"} label="ด้านหลัง" onClick={() => setActiveView("back")} />
          <ViewButton active={activeView === "front"} label="ด้านหน้า" onClick={() => setActiveView("front")} />
        </div>
      </motion.div>

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
  side,
  show,
  delay,
  reduceMotion,
}: {
  className: string;
  children: ReactNode;
  side: "left" | "right";
  show: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
  // เลื่อนเข้าจากด้านนอกของเวที (ซ้ายเข้าจากซ้าย ขวาเข้าจากขวา) — สมมาตร
  const hidden = { opacity: 0, scale: 0.86, x: side === "left" ? -14 : 14 };
  return (
    <motion.div
      aria-hidden="true"
      data-hero-chip={side}
      className={`absolute z-20 hidden items-center gap-1.5 rounded-xl border border-border-default bg-white/95 px-3 py-1.5 text-xs font-semibold text-text-heading shadow-lg backdrop-blur sm:flex ${className}`}
      initial={hidden}
      animate={show ? { opacity: 1, scale: 1, x: 0 } : hidden}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
