"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type PanInfo,
} from "framer-motion";
import { CreditCard, MoveHorizontal, ShieldCheck, Truck, Zap } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { INTENT_SEEN_EVENT, isIntentSeen } from "@/components/IntentGate";

/*
 * Hero: iPhone Duo (Star White) — ลำดับภาพ 90 เฟรมที่เรนเดอร์จากโมเดล 3D
 *
 * ที่มา: "Apple iPhone Duo Fold Star White 2026 (Animated)" โดย AakashMansukhani (Sketchfab, Free Standard license
 * — ใช้เชิงพาณิชย์ได้ ไม่ต้องให้เครดิต) https://sketchfab.com/3d-models/240492141edd4594ae13082a7fcbbb29
 * เว็บเสิร์ฟแค่ภาพเรนเดอร์ (public/images/hero-duo) ไม่มีไฟล์โมเดลบนเว็บ
 *
 * เฟรม 0–53 = เครื่องพับ หมุนจากด้านหลัง (ชุดกล้อง) ผ่านขอบบานพับ มาที่จอนอก
 * เฟรม 53–89 = กางออกเป็นจอใหญ่ หมุนเข้าหน้าตรง (เฟรมสุดท้ายสมมาตรพอดี)
 * กล้องหมุนรอบจุดกึ่งกลางจริงของตัวเครื่อง (วัดจากภาพ) + จัดกลางแนวนอนทุกเฟรม → เครื่องอยู่กลางเวทีตลอด
 */

export type HeroDuoView = "back" | "folded" | "open";
/** pending = ก่อนตัดสินใจ (SSR/ก่อน hydrate) · intro = motion เปิดตัว · idle = โต้ตอบได้ปกติ */
export type HeroIntroPhase = "pending" | "intro" | "idle";

export const DUO_FRAMES = 90;
export const VIEW_FRAME: Record<HeroDuoView, number> = { back: 0, folded: 53, open: DUO_FRAMES - 1 };
const VIEWS: HeroDuoView[] = ["back", "folded", "open"];
const VIEW_LABEL: Record<HeroDuoView, string> = { back: "ด้านหลัง", folded: "พับ", open: "กาง" };
/** ขนาดภาพเฟรม (กว้าง × สูง) — สัดส่วนเดียวกันทุกชุด */
const FRAME_ASPECT = 1100 / 932;

const FLICK_VELOCITY_PX = 420;
/** ลากครบความกว้างเวที = เดินหน้า/ถอยหลังกี่เฟรม (เกินครึ่งเรื่องนิดหน่อย — ลากสองครั้งจากหลังถึงกาง) */
const FRAMES_PER_STAGE_WIDTH = 64;

/** ความยาว motion เปิดตัวทั้งหมด (วินาที) */
export const HERO_INTRO_SECONDS = 5.5;
/** ช่วงที่เครื่องหมุน+กาง (ที่เหลือคือป้าย/ปุ่มทยอยขึ้นแล้วนิ่ง) */
const PHONES_SECONDS = 3.6;
const CHIPS_AT_SECONDS = PHONES_SECONDS;
const CONTROLS_AT_SECONDS = 4.4;
/** รอโหลดเฟรมได้นานสุดเท่านี้ ไม่ทันก็ข้าม intro (ไม่ให้ลูกค้ารอ) */
const INTRO_LOAD_TIMEOUT_MS = 3000;
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

// ---------- ตรรกะเฟรม (pure — ทดสอบได้) ----------

const clampFrame = (f: number) => Math.min(DUO_FRAMES - 1, Math.max(0, f));

/** ท่าที่ใกล้ที่สุดกับเฟรมนี้ */
export function nearestView(frame: number): HeroDuoView {
  return VIEWS.reduce((best, v) => (Math.abs(VIEW_FRAME[v] - frame) < Math.abs(VIEW_FRAME[best] - frame) ? v : best), VIEWS[0]);
}

/** ท่าถัดไป/ก่อนหน้า (ปุ่มลูกศร) — สุดทางแล้วอยู่ที่เดิม */
export function stepView(view: HeroDuoView, dir: 1 | -1): HeroDuoView {
  const i = VIEWS.indexOf(view) + dir;
  return VIEWS[Math.min(VIEWS.length - 1, Math.max(0, i))];
}

/** ลากซ้าย = เดินหน้า (หมุนเข้าหาจอ แล้วกาง) · ลากขวา = ถอยกลับไปด้านหลัง */
export function frameAfterDrag(startFrame: number, offsetX: number, stageWidth: number): number {
  if (!(stageWidth > 0)) return clampFrame(startFrame);
  return clampFrame(startFrame - (offsetX / stageWidth) * FRAMES_PER_STAGE_WIDTH);
}

/** ปล่อยนิ้ว → เข้าท่าที่ใกล้สุด · สะบัดเร็ว = ไปท่าถัดไปตามทิศที่สะบัด (จากท่าที่ใกล้สุดตอนปล่อย) */
export function settleView(frame: number, velocityX: number): HeroDuoView {
  const near = nearestView(frame);
  if (velocityX <= -FLICK_VELOCITY_PX && frame >= VIEW_FRAME[near]) return stepView(near, 1);
  if (velocityX >= FLICK_VELOCITY_PX && frame <= VIEW_FRAME[near]) return stepView(near, -1);
  return near;
}

export type FrameSize = 640 | 800 | 1100;

export function frameSrc(n: number, size: FrameSize): string {
  return `/images/hero-duo/${size}/f${String(n).padStart(2, "0")}.webp`;
}

/**
 * ชุดภาพตามจำนวนพิกเซลจริงบนจอ (กว้างเวที × DPR) — ขยายได้ไม่เกิน ~1.15 เท่าก่อนขยับชุดใหญ่
 * มือถือทั่วไป (358px × 2 = 716) → 800 · จอคอม (500 × 2) → 1100 · ประหยัดเน็ต → 640 เสมอ
 */
export function pickFrameSize(devicePx: number, saveData: boolean): FrameSize {
  if (saveData || devicePx <= 700) return 640;
  if (devicePx <= 900) return 800;
  return 1100;
}

/** ลำดับโหลด: ท่าหลัก 3 ท่าก่อน แล้วไล่เติมแบบหยาบ→ละเอียด (โหลดไม่ครบก็ยังลากดูได้ทั่วทั้งเรื่อง) */
export function loadOrder(): number[] {
  const order: number[] = [VIEW_FRAME.open, VIEW_FRAME.back, VIEW_FRAME.folded];
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < DUO_FRAMES; i += step) if (!order.includes(i)) order.push(i);
  }
  return order;
}

/** เฟรมที่โหลดแล้วซึ่งใกล้เป้าหมายที่สุด (ยังไม่มีเลย = null) */
export function nearestLoaded(target: number, loaded: readonly boolean[]): number | null {
  const t = Math.round(clampFrame(target));
  for (let d = 0; d < DUO_FRAMES; d++) {
    if (loaded[t - d]) return t - d;
    if (loaded[t + d]) return t + d;
  }
  return null;
}

// ---------- จุดขาย (คำอ้างที่หน้าเว็บประกาศอยู่แล้ว — ห้ามเพิ่มคำอ้างใหม่ที่ไม่มีหลักฐาน) ----------

// 2 แถว (บน/ล่าง) × ซ้าย-ขวา ล้อมมุมเครื่องจากด้านนอก — ไม่ทับตัวเครื่องไม่ว่าจะพับหรือกาง
const CHIPS: { side: "left" | "right"; icon: ReactNode; label: string }[] = [
  { side: "left", icon: <ShieldCheck size={13} className="text-info-text" />, label: "เครื่องแท้แกะกล่อง" },
  { side: "right", icon: <Zap size={13} className="text-yellow-hover" />, label: "อนุมัติไวใน 24 ชม." },
  { side: "left", icon: <CreditCard size={13} className="text-success-text" />, label: "ไม่ต้องมีบัตร" },
  { side: "right", icon: <Truck size={13} className="text-yellow-hover" />, label: "ส่งด่วนทั่วไทย" },
];

/*
 * Storyboard (5.5 วิ)
 * 0.0–0.6  แสงฟุ้งสว่างขึ้น · เครื่องพับ (ด้านหลัง) ลอยขึ้นกลางเวที
 * 0.3–2.1  หมุนช้าโชว์ชุดกล้อง → ขอบบานพับ → จอนอก
 * 2.1–3.6  กางออกเป็นจอใหญ่ หมุนเข้าหน้าตรง
 * 3.6–4.4  ป้ายข้อดีทยอยขึ้น สลับซ้าย-ขวา
 * 4.4–5.5  ปุ่มเลือกท่าขึ้น แล้วทุกอย่างนิ่ง → โต้ตอบได้
 */
const INTRO_KEYS = { frames: [VIEW_FRAME.back, VIEW_FRAME.back, VIEW_FRAME.folded, VIEW_FRAME.open], times: [0, 0.08, 0.58, 1] };

export default function HeroPhone() {
  const reduceMotion = !!useReducedMotion();
  const [phase, setPhase] = useState<HeroIntroPhase>("pending");
  /** ขั้นของ intro: 0 = เครื่อง · 1 = ป้ายขึ้น · 2 = ปุ่มขึ้น (ข้าม intro → idle แสดงทุกอย่างทันที) */
  const [introStage, setIntroStage] = useState(0);
  const [view, setView] = useState<HeroDuoView>("open");
  const decided = useRef<boolean | null>(null);

  // ---------- เฟรม: โหลด + วาดบน canvas ----------
  const frame = useMotionValue<number>(VIEW_FRAME.open);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const images = useRef<(HTMLImageElement | null)[]>(Array(DUO_FRAMES).fill(null));
  const loaded = useRef<boolean[]>(Array(DUO_FRAMES).fill(false));
  const [loadedCount, setLoadedCount] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const drawnIndex = useRef(-1);
  const tween = useRef<AnimationPlaybackControls | null>(null);

  const draw = useCallback((force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const idx = nearestLoaded(frame.get(), loaded.current);
    if (idx == null || (!force && idx === drawnIndex.current)) return;
    const img = images.current[idx];
    const ctx = canvas.getContext("2d");
    if (!img || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawnIndex.current = idx;
    setDrawn(true);
  }, [frame]);

  useMotionValueEvent(frame, "change", () => draw());

  // canvas ตามขนาดเวทีจริง × DPR (สูงสุด 2 — เกินกว่านี้ตาแยกไม่ออก แต่กินแรงเครื่อง)
  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(stage.clientWidth * dpr);
      const h = Math.round(w / FRAME_ASPECT);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; draw(true); }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [draw]);

  // โหลดเฟรม (ชุดเล็กเมื่อจอเล็ก/ประหยัดเน็ต) — ท่าหลักก่อน แล้วเติมหยาบ→ละเอียด
  useEffect(() => {
    let cancelled = false;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const size = pickFrameSize((stageRef.current?.clientWidth ?? 460) * Math.min(2, window.devicePixelRatio || 1), !!conn?.saveData);
    const queue = loadOrder();
    let next = 0;
    const worker = async () => {
      while (!cancelled && next < queue.length) {
        const n = queue[next++];
        const img = new window.Image();
        img.decoding = "async";
        img.src = frameSrc(n, size);
        try { await img.decode(); } catch { continue; }   // เฟรมไหนพังข้ามไป — ใช้เฟรมใกล้เคียงแทน
        if (cancelled) return;
        images.current[n] = img;
        loaded.current[n] = true;
        setLoadedCount((c) => c + 1);
        if (Math.abs(n - frame.get()) < 1.5 || drawnIndex.current < 0) draw(true);
      }
    };
    void Promise.all([worker(), worker(), worker(), worker()]);   // 4 สายพร้อมกัน
    return () => { cancelled = true; };
  }, [draw, frame]);

  const allLoaded = loadedCount >= DUO_FRAMES;

  // ---------- ตัดสินว่าจะเล่น intro ไหม (หลัง hydrate — SSR เห็น pending เสมอ) ----------
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
      if (decided.current) { frame.set(VIEW_FRAME.back); setView("back"); }
      setPhase(decided.current ? "intro" : "idle");
    };
    // ป๊อปอัพ "สนใจบริการไหน" (IntentGate) จะเปิดทับครั้งแรกสุด → รอให้ปิดก่อน ไม่งั้น intro เล่นอยู่หลังฉากมืด
    if (decided.current !== null || isIntentSeen()) {
      start();
      return;
    }
    window.addEventListener(INTENT_SEEN_EVENT, start, { once: true });
    return () => window.removeEventListener(INTENT_SEEN_EVENT, start);
  }, [reduceMotion, frame]);

  // intro: รอเฟรมครบ (ไม่เกิน 3 วิ ไม่ทันก็ข้าม) แล้วเล่นหมุน+กาง · ป้าย/ปุ่มทยอยตามเวลาเดิม
  const [introRunning, setIntroRunning] = useState(false);
  useEffect(() => {
    if (phase !== "intro" || introRunning) return;
    if (allLoaded) { setIntroRunning(true); return; }
    const t = window.setTimeout(() => { frame.set(VIEW_FRAME.open); setView("open"); setPhase("idle"); }, INTRO_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [phase, allLoaded, introRunning, frame]);

  useEffect(() => {
    if (!introRunning || phase !== "intro") return;
    setIntroStage(0);
    tween.current?.stop();
    tween.current = animate(frame, INTRO_KEYS.frames, {
      duration: PHONES_SECONDS,
      times: INTRO_KEYS.times,
      ease: ["linear", [0.45, 0, 0.25, 1], [0.6, 0, 0.2, 1]],
    });
    const timers = [
      window.setTimeout(() => setView("open"), PHONES_SECONDS * 1000),
      window.setTimeout(() => setIntroStage(1), CHIPS_AT_SECONDS * 1000),
      window.setTimeout(() => setIntroStage(2), CONTROLS_AT_SECONDS * 1000),
      window.setTimeout(() => setPhase("idle"), HERO_INTRO_SECONDS * 1000),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [introRunning, phase, frame]);

  /** ไปท่าที่เลือก — ระยะไกลใช้เวลานานขึ้น (หมุนครบเรื่อง ~1.3 วิ) */
  const goTo = useCallback((v: HeroDuoView) => {
    setView(v);
    tween.current?.stop();
    const target = VIEW_FRAME[v];
    if (reduceMotion) { frame.set(target); return; }
    const dist = Math.abs(target - frame.get()) / (DUO_FRAMES - 1);
    tween.current = animate(frame, target, { duration: 0.35 + dist * 0.95, ease: [0.45, 0, 0.2, 1] });
  }, [frame, reduceMotion]);

  // แตะ/โฟกัส/กดคีย์ระหว่าง intro → ข้ามไปสถานะโต้ตอบได้ทันที (ไม่บังคับดูจนจบ)
  const skipIntro = () => {
    if (phase !== "intro") return;
    tween.current?.stop();
    frame.set(VIEW_FRAME.open);
    setView("open");
    setPhase("idle");
  };

  const intro = phase === "intro";
  const animated = phase === "idle" && !reduceMotion;
  const chipsShown = phase === "idle" || (intro && introStage >= 1);
  const controlsShown = phase === "idle" || (intro && introStage >= 2);

  // ---------- เอียงตามเมาส์ (เบา ๆ ให้มีมิติ) ----------
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 120, damping: 18 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 18 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [5, -5]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [-4, 4]);

  // เงาใต้เครื่อง: กว้างตามท่า (พับแคบ · กางกว้าง) และอยู่ใต้ขอบล่างจริงของเครื่องในแต่ละเฟรม
  // (ขอบล่างวัดจากภาพเรนเดอร์ — ช่วงกางฝั่งที่หมุนเข้าหากล้องจะยื่นต่ำลง)
  const shadowWidth = useTransform(frame, [0, VIEW_FRAME.folded, 70, VIEW_FRAME.open], ["38%", "38%", "60%", "78%"]);
  const shadowTop = useTransform(frame, [0, 20, 40, 53, 62, 70, 78, 86, 89], ["86.5%", "90%", "89.5%", "86.8%", "88.2%", "96.5%", "92.4%", "84.4%", "83.5%"]);

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

  // ---------- ลากหมุน (แนวนอน · แนวตั้งยังเลื่อนหน้าได้) ----------
  const dragStart = useRef(0);
  const handlePanStart = () => {
    if (phase !== "idle") return;
    tween.current?.stop();
    dragStart.current = frame.get();
  };
  const handlePan = (_e: PointerEvent, info: PanInfo) => {
    if (phase !== "idle") return;
    frame.set(frameAfterDrag(dragStart.current, info.offset.x, stageRef.current?.clientWidth ?? 0));
  };
  const handlePanEnd = (_e: PointerEvent, info: PanInfo) => {
    if (phase !== "idle") return;
    goTo(settleView(frame.get(), info.velocity.x));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); goTo(stepView(view, -1)); }
    if (event.key === "ArrowRight") { event.preventDefault(); goTo(stepView(view, 1)); }
    if (event.key === "Home") { event.preventDefault(); goTo("back"); }
    if (event.key === "End") { event.preventDefault(); goTo("open"); }
  };

  return (
    <div
      className="relative flex min-w-0 flex-col items-center overflow-hidden py-2"
      style={{ perspective: 1200 }}
      data-hero-phase={phase}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerDownCapture={skipIntro}
      onFocusCapture={skipIntro}
      onKeyDownCapture={skipIntro}
    >
      {/* แสงฟุ้งหลังเครื่อง (โทนทรายอุ่นตามวอลเปเปอร์) — จังหวะแรกของ intro */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[44%] h-[64%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[46%] bg-[radial-gradient(ellipse_at_center,rgba(214,186,140,0.30)_0%,rgba(255,212,0,0.10)_40%,transparent_68%)] blur-2xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase === "pending" ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
        transition={intro ? { duration: 1.2, ease: "easeOut" } : { duration: reduceMotion ? 0 : 0.6 }}
      />

      <ChipRow chips={CHIPS.slice(0, 2)} offset={0} show={chipsShown} intro={intro} reduceMotion={reduceMotion} />

      <motion.div
        ref={stageRef}
        className="relative z-10 -mt-1 -mb-[9%] aspect-[1100/932] w-[min(92vw,440px)] cursor-grab select-none outline-none [touch-action:pan-y] active:cursor-grabbing focus-visible:rounded-[2rem] focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-4 md:w-[min(100%,500px)]"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        role="group"
        tabIndex={0}
        aria-roledescription="ภาพหมุนได้"
        aria-label="iPhone Duo สี Star White ลากซ้าย–ขวาหรือใช้ปุ่มลูกศรเพื่อหมุนดูด้านหลัง พับ และกางเครื่อง"
        onKeyDown={handleKeyDown}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        initial={{ opacity: 0, y: 24 }}
        animate={phase === "pending" ? { opacity: 0, y: 24 } : { opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : intro ? 0.6 : 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0"
          animate={animated ? { y: [0, -8, 0] } : { y: 0 }}
          transition={animated ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
        >
          {/* ภาพนิ่งท่ากาง (LCP) — ระหว่างรอเฟรมแรกขึ้น canvas · intro เริ่มจากด้านหลังจึงไม่โชว์ภาพนี้ */}
          {!drawn && phase !== "intro" && (
            <Image
              src={frameSrc(VIEW_FRAME.open, 1100)}
              alt=""
              fill
              priority
              unoptimized
              draggable={false}
              sizes="(max-width: 768px) 92vw, 500px"
              className="object-contain"
            />
          )}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full drop-shadow-[0_26px_24px_rgba(30,30,40,0.18)]"
          />
        </motion.div>

        {/* เงาใต้เครื่อง — กว้างตามท่า (พับแคบ · กางกว้าง) */}
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 h-4 -translate-x-1/2 rounded-[50%] bg-slate-900/20 blur-md"
          style={{ width: shadowWidth, top: shadowTop }}
          initial={{ opacity: 0 }}
          animate={phase === "pending" ? { opacity: 0 } : animated ? { opacity: [0.9, 0.55, 0.9] } : { opacity: 0.9 }}
          transition={animated ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : { duration: intro ? 1.0 : 0 }}
        />
      </motion.div>

      <ChipRow chips={CHIPS.slice(2, 4)} offset={2} show={chipsShown} intro={intro} reduceMotion={reduceMotion} />

      <motion.div
        className="relative z-20 mt-3 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={controlsShown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
      >
        <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
          <MoveHorizontal size={15} aria-hidden="true" />
          ลากซ้าย–ขวาเพื่อหมุนและกางเครื่อง
        </p>
        <div className="grid grid-cols-3 rounded-full border border-border-default bg-white/90 p-1 shadow-sm backdrop-blur">
          {VIEWS.map((v) => (
            <ViewButton key={v} active={view === v} label={VIEW_LABEL[v]} onClick={() => goTo(v)} />
          ))}
        </div>
      </motion.div>

      <span className="sr-only" aria-live="polite">
        กำลังแสดง{view === "back" ? "ด้านหลัง" : view === "folded" ? "เครื่องตอนพับ" : "เครื่องตอนกาง"}
      </span>
    </div>
  );
}

/** แถวป้าย ซ้าย-ขวา (ซ่อนบนมือถือ — จอแคบให้เครื่องเต็มความกว้าง) */
function ChipRow({ chips, offset, show, intro, reduceMotion }: {
  chips: typeof CHIPS;
  offset: number;
  show: boolean;
  intro: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="relative z-20 hidden w-full grid-cols-2 sm:grid" aria-hidden="true">
      {chips.map((chip, i) => (
        <Chip
          key={chip.label}
          className={chip.side === "left" ? "justify-self-start" : "justify-self-end"}
          side={chip.side}
          show={show}
          delay={intro ? (offset + i) * 0.2 : 0.2 + (offset + i) * 0.08}
          reduceMotion={reduceMotion}
        >
          {chip.icon} {chip.label}
        </Chip>
      ))}
    </div>
  );
}

function ViewButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 min-w-[4.5rem] rounded-full px-4 text-xs font-semibold transition-colors ${
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
      className={`flex items-center gap-1.5 rounded-xl border border-border-default bg-white/95 px-3 py-1.5 text-xs font-semibold text-text-heading shadow-lg backdrop-blur ${className}`}
      initial={hidden}
      animate={show ? { opacity: 1, scale: 1, x: 0 } : hidden}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
