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
import { Box, MoveHorizontal, ShieldCheck, Sparkles, Truck, X } from "lucide-react";
import Image from "next/image";
import Script from "next/script";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

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
  const [exploring, setExploring] = useState(false);
  const reduceMotion = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  const closeViewer = () => {
    setExploring(false);
    requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!exploring) return;
    close.current?.focus({ preventScroll: true });
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setExploring(false);
    });
    if (stage.current) observer.observe(stage.current);
    const onVisibility = () => {
      if (document.hidden) setExploring(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [exploring]);

  return (
    <div ref={stage} className="relative min-w-0" onKeyDown={(event) => {
      if (event.key === "Escape" && exploring) closeViewer();
    }}>
      {exploring ? (
        <div className="overflow-hidden rounded-[2rem] bg-[#191919] text-white shadow-[0_24px_70px_-30px_rgba(112,57,23,0.45)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-orange-300">EXPLORE IN 3D</p>
              <p className="mt-1 text-sm font-medium">iPhone 17 Pro Max · สีส้ม</p>
            </div>
            <button ref={close} type="button" onClick={closeViewer} className="flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-white/25 px-3 text-xs hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-yellow">
              <X size={15} aria-hidden="true" /> กลับภาพปกติ
            </button>
          </div>
          <PhoneModelViewer reduceMotion={!!reduceMotion} />
          <div className="space-y-2 px-4 py-3 text-xs leading-relaxed text-white/70 sm:px-5">
            <p>ลากเพื่อหมุน · จีบสองนิ้วหรือใช้ล้อเมาส์เพื่อซูม · เปิดเต็มจอเพื่อดูรายละเอียด</p>
            <p className="sm:hidden">เลื่อนหน้าต่อได้จากพื้นที่นอกภาพ 3D หรือกดกลับภาพปกติ</p>
            <p className="text-[10px] text-white/50">
              <a className="underline underline-offset-2" href="https://sketchfab.com/3d-models/iphone-17-pro-max-87fc1df741384124a8ce0226d2b2058d" target="_blank" rel="noopener noreferrer">3D: iPhone 17 Pro Max</a>
              {" by "}<a className="underline underline-offset-2" href="https://sketchfab.com/MG990" target="_blank" rel="noopener noreferrer">MajdyModels</a>
              {" · "}<a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
              {" · ภาพจำลองประกอบการชมสินค้า"}
            </p>
          </div>
        </div>
      ) : (
        <>
          <HeroPhonePoster />
          <div className="mt-4 flex flex-col items-center gap-2 pb-2">
            <button ref={launch} type="button" onClick={() => setExploring(true)} className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-text-heading px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-orange-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow">
              <Box size={18} className="text-orange-300" aria-hidden="true" /> สำรวจเครื่องแบบ 3D <span className="text-orange-300">360°</span>
            </button>
            <p className="text-xs text-text-muted">หมุนดูรอบเครื่องและซูมรายละเอียดได้</p>
          </div>
        </>
      )}
    </div>
  );
}

type Point3D = [number, number, number];
type ModelCamera = { position: Point3D; target: Point3D };
type ModelAPI = {
  start: () => void;
  stop: () => void;
  addEventListener: (name: string, callback: () => void) => void;
  getCameraLookAt: (callback: (error: unknown, camera: ModelCamera) => void) => void;
  setCameraLookAt: (position: Point3D, target: Point3D, duration: number) => void;
};
type ModelSDK = new (version: string, iframe: HTMLIFrameElement) => {
  init: (id: string, options: Record<string, unknown>) => void;
};

function PhoneModelViewer({ reduceMotion }: { reduceMotion: boolean }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const api = useRef<ModelAPI | null>(null);
  const camera = useRef<ModelCamera | null>(null);
  const alive = useRef(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState("back");

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; api.current?.stop(); };
  }, []);

  const chooseView = (next: string) => {
    if (!camera.current || !api.current) return;
    const { position, target } = camera.current;
    const angle = next === "front" ? Math.PI : 0;
    const scale = next === "detail" ? 0.7 : 1;
    const x = position[0] - target[0];
    const y = position[1] - target[1];
    api.current.setCameraLookAt([
      target[0] + (x * Math.cos(angle) - y * Math.sin(angle)) * scale,
      target[1] + (x * Math.sin(angle) + y * Math.cos(angle)) * scale,
      target[2] + (position[2] - target[2]) * scale,
    ], target, reduceMotion ? 0 : 0.8);
    setView(next);
  };

  const initialize = () => {
    const SDK = (window as unknown as { Sketchfab?: ModelSDK }).Sketchfab;
    if (!iframe.current || !SDK) { setFailed(true); return; }
    const client = new SDK("1.12.1", iframe.current);
    client.init("87fc1df741384124a8ce0226d2b2058d", {
      autostart: 1, autospin: 0, camera: 0, preload: 1,
      ui_stop: 0, ui_inspector: 0, ui_vr: 0, ui_ar: 0,
      success: (viewer: ModelAPI) => {
        if (!alive.current) { viewer.stop(); return; }
        api.current = viewer;
        viewer.addEventListener("viewerready", () => {
          if (!alive.current) return;
          viewer.getCameraLookAt((error, initial) => {
            if (!alive.current || error) return;
            const position = initial.position.map((value, index) =>
              initial.target[index] + (value - initial.target[index]) * 1.35,
            ) as Point3D;
            camera.current = { position, target: initial.target };
            viewer.setCameraLookAt(position, initial.target, reduceMotion ? 0 : 0.9);
            setReady(true);
          });
        });
        viewer.start();
      },
      error: () => { if (alive.current) setFailed(true); },
    });
  };

  return <>
    <Script src="https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js" strategy="afterInteractive" onReady={initialize} onError={() => setFailed(true)} />
    <div className="relative">
      {!ready && <div role="status" className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center text-xs text-orange-200">{failed ? "โหลด 3D ไม่สำเร็จ สามารถกลับภาพปกติได้" : "กำลังเตรียมรายละเอียดเครื่อง 3D…"}</div>}
      <iframe ref={iframe} title="สำรวจ iPhone 17 Pro Max สีส้มแบบ 3D หมุนและซูมดูรายละเอียด" className="block h-[min(62svh,480px)] min-h-[320px] w-full border-0 md:h-[470px]" allow="fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
    </div>
    <div className="flex flex-wrap justify-center gap-2 px-3 pt-3" aria-label="มุมกล้อง 3D">
      {[["back", "ด้านหลัง"], ["front", "ด้านหน้า"], ["detail", "ขยายรายละเอียด"]].map(([value, label]) => <button key={value} type="button" disabled={!ready} aria-pressed={view === value} onClick={() => chooseView(value)} className={`min-h-11 rounded-full px-4 text-xs font-medium transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-yellow ${view === value ? "bg-orange-200 text-orange-950" : "bg-white/10 text-white hover:bg-white/20"}`}>{label}</button>)}
    </div>
  </>;
}

function HeroPhonePoster() {
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
        className="absolute h-[72%] w-[54%] rounded-[46%] bg-[radial-gradient(ellipse_at_center,rgba(255,151,76,0.22)_0%,rgba(255,196,64,0.10)_44%,transparent_72%)] blur-2xl md:h-[76%] md:w-[58%]"
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
