"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import toast from "react-hot-toast";
import { Gift, Copy, X, Sparkles } from "lucide-react";

interface Result { percent: number; code: string; expiresAt: string | null; }
const COLORS = ["#FFD400", "#1a1a1a", "#FFE566", "#333333"]; // สลับ เหลือง/ดำ

// จุดบนวงกลม (0° = บนสุด, ตามเข็มนาฬิกา) รัศมี radius จากจุดกลาง (100,100)
const pt = (angleDeg: number, radius: number): [number, number] => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [100 + radius * Math.cos(a), 100 + radius * Math.sin(a)];
};

export default function SpinWheel({ segments, alreadyWon, onClose }: {
  segments: number[];
  alreadyWon?: Result | null;
  onClose: () => void;
}) {
  const N = Math.max(1, segments.length);
  const seg = 360 / N;
  const [mounted, setMounted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Result | null>(alreadyWon ?? null);
  useEffect(() => setMounted(true), []);

  const slicePath = (i: number) => {
    const [x1, y1] = pt(i * seg, 100);
    const [x2, y2] = pt((i + 1) * seg, 100);
    const large = seg > 180 ? 1 : 0;
    return `M100 100 L${x1} ${y1} A100 100 0 ${large} 1 ${x2} ${y2} Z`;
  };

  const spin = async () => {
    if (spinning || result) return;
    setSpinning(true);
    try {
      const r = await api.post("/spin");
      const res: Result = r.data;
      const idx = Math.max(0, segments.indexOf(res.percent));
      const center = idx * seg + seg / 2;                 // มุมกลางช่อง (ตามเข็ม จากบนสุด)
      const offset = (Math.random() - 0.5) * seg * 0.6;   // สุ่มในช่องเดิม ให้ดูสมจริง
      setRotation(360 * 6 - center + offset);             // หมุน 6 รอบ แล้วหยุดที่ช่องที่ชนะ
      setTimeout(() => { setResult(res); setSpinning(false); }, 4200);
    } catch (e) {
      setSpinning(false);
      toast.error(getApiError(e, "หมุนไม่สำเร็จ กรุณาลองใหม่"));
    }
  };

  const copyCode = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.code); toast.success("คัดลอกโค้ดแล้ว"); } catch { /* */ }
  };

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <button onClick={onClose} aria-label="ปิด" className="absolute right-4 top-4 rounded-full p-1.5 text-text-muted hover:bg-bg-subtle"><X size={20} /></button>
        <div className="mb-1 flex items-center justify-center gap-2 text-yellow-hover"><Gift size={22} /><h3 className="text-xl font-bold text-text-heading">ต้อนรับสมาชิกใหม่!</h3></div>
        <p className="mb-3 text-sm text-text-muted">หมุนวงล้อ 1 ครั้ง รับโค้ดส่วนลดทันที 🎉</p>

        {/* วงล้อ */}
        <div className="relative mx-auto my-2 h-60 w-60">
          <div className="absolute left-1/2 top-[-4px] z-20 -translate-x-1/2"
            style={{ width: 0, height: 0, borderLeft: "11px solid transparent", borderRight: "11px solid transparent", borderTop: "20px solid #E24B4A" }} />
          <motion.svg viewBox="0 0 200 200" className="h-full w-full"
            animate={{ rotate: rotation }} transition={{ duration: 4, ease: [0.17, 0.67, 0.2, 1] }}>
            {segments.map((p, i) => {
              const [lx, ly] = pt(i * seg + seg / 2, 62);
              const dark = i % COLORS.length === 1 || i % COLORS.length === 3;
              return (
                <g key={i}>
                  <path d={slicePath(i)} fill={COLORS[i % COLORS.length]} stroke="#ffffff" strokeWidth="1.5" />
                  <text x={lx} y={ly} fill={dark ? "#FFD400" : "#1a1a1a"} fontSize="16" fontWeight="700"
                    textAnchor="middle" dominantBaseline="central" transform={`rotate(${i * seg + seg / 2} ${lx} ${ly})`}>{p}%</text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="15" fill="#ffffff" stroke="#FFD400" strokeWidth="4" />
          </motion.svg>
        </div>

        {!result ? (
          <button onClick={spin} disabled={spinning} className="btn-primary mt-4 w-full py-3.5 text-base disabled:opacity-60">
            {spinning ? "กำลังหมุน..." : <><Sparkles size={18} /> หมุนเลย!</>}
          </button>
        ) : (
          <div className="mt-4 rounded-2xl border-2 border-yellow bg-yellow/10 p-4">
            <p className="text-sm text-text-muted">คุณได้รับส่วนลด</p>
            <p className="text-4xl font-bold text-price">{result.percent}%</p>
            <button onClick={copyCode} className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-mono font-bold text-text-heading shadow-sm transition-colors hover:bg-bg-subtle">
              <Copy size={15} /> {result.code}
            </button>
            <p className="mt-2 text-xs text-text-muted">
              แจ้งโค้ดนี้กับแอดมินตอนสั่งซื้อ{result.expiresAt ? ` · ใช้ได้ถึง ${new Date(result.expiresAt).toLocaleDateString("th-TH")}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
