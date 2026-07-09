"use client";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Package, Truck, Home, Store, ShoppingBag, Copy, ExternalLink, PartyPopper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";

export interface TrackOrder {
  status: string;
  shippingAddress?: string | null;
  shippingPartner?: string | null;
  trackingNumber?: string | null;
  confirmedAt?: string | null;
  preparingAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
}

interface Step { label: string; icon: LucideIcon; at?: string | null }

// สถานะปัจจุบัน → ดัชนีขั้น (0..3)
const STATUS_INDEX: Record<string, number> = {
  CONFIRMED: 0, PREPARING: 1, SHIPPED: 2, READY_PICKUP: 2, DELIVERED: 3, PICKED_UP: 3, COMPLETED: 3,
};

const fmt = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

// ลิงก์ติดตามพัสดุตามขนส่ง
const trackUrl = (partner?: string | null, no?: string | null) => {
  if (!no) return null;
  const p = (partner || "").toLowerCase();
  if (p.includes("flash")) return `https://www.flashexpress.com/fle/tracking?se=${encodeURIComponent(no)}`;
  if (p.includes("kerry")) return `https://th.kerryexpress.com/th/track/?track=${encodeURIComponent(no)}`;
  if (p.includes("j&t") || p.includes("jt")) return `https://www.jtexpress.co.th/index/query/gzquery.html?bills=${encodeURIComponent(no)}`;
  if (p.includes("ไปรษณีย์") || p.includes("thai") || p.includes("ems")) return `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(no)}`;
  return `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(no)}`;
};

export default function DeliveryTracker({ order }: { order: TrackOrder }) {
  const reduce = useReducedMotion();
  const isPickup = !order.shippingAddress;

  const steps: Step[] = isPickup
    ? [
        { label: "ยืนยันแล้ว", icon: CheckCircle2, at: order.confirmedAt },
        { label: "เตรียมของ", icon: Package, at: order.preparingAt },
        { label: "พร้อมรับ", icon: Store, at: order.shippedAt },
        { label: "รับแล้ว", icon: ShoppingBag, at: order.deliveredAt },
      ]
    : [
        { label: "ยืนยันแล้ว", icon: CheckCircle2, at: order.confirmedAt },
        { label: "เตรียมของ", icon: Package, at: order.preparingAt },
        { label: "กำลังส่ง", icon: Truck, at: order.shippedAt },
        { label: "ถึงมือคุณ", icon: Home, at: order.deliveredAt },
      ];

  const idx = STATUS_INDEX[order.status] ?? 0;
  const total = steps.length;
  const progress = total > 1 ? idx / (total - 1) : 0;   // 0..1
  const moving = order.status === "SHIPPED";
  const Vehicle = isPickup ? ShoppingBag : Truck;
  const url = trackUrl(order.shippingPartner, order.trackingNumber);

  const copy = () => {
    if (!order.trackingNumber) return;
    navigator.clipboard?.writeText(order.trackingNumber).then(
      () => toast.success("คัดลอกเลขพัสดุแล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ")
    );
  };

  return (
    <div className="rounded-2xl border border-border-default bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <Truck size={18} className="text-yellow-hover" />
        <h3 className="font-bold text-text-heading">{isPickup ? "สถานะการรับเครื่อง" : "สถานะการจัดส่ง"}</h3>
      </div>
      <p className="mb-7 text-sm text-text-muted">{steps[idx]?.label && <>ขั้นปัจจุบัน: <span className="font-semibold text-text-heading">{steps[idx].label}</span></>}</p>

      {/* ราง + รถวิ่ง */}
      <div className="relative px-3 pt-9">
        {/* ถนนพื้น */}
        <div className="absolute left-3 right-3 top-[3.25rem] h-1.5 rounded-full bg-bg-subtle" />
        {/* ส่วนที่ผ่านแล้ว (เหลือง) */}
        <motion.div
          className="absolute left-3 top-[3.25rem] h-1.5 rounded-full bg-yellow"
          initial={false}
          animate={{ width: `calc((100% - 1.5rem) * ${progress})` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 18 }}
        />

        {/* รถ — เลื่อนไปตามความคืบหน้า */}
        <motion.div
          className="absolute top-0 z-10"
          initial={false}
          animate={{ left: `calc(0.75rem + (100% - 1.5rem) * ${progress})` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 16 }}
          style={{ x: "-50%" }}
        >
          <motion.div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow text-[#1a1a1a] shadow-md"
            animate={reduce || !moving ? undefined : { y: [0, -3, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Vehicle size={18} />
          </motion.div>
        </motion.div>

        {/* จุดหมุด 4 ขั้น */}
        <div className="relative flex justify-between">
          {steps.map((s, i) => {
            const done = i <= idx;
            const Icon = i < idx ? CheckCircle2 : s.icon;
            return (
              <div key={i} className="flex w-0 flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${done ? "border-yellow bg-yellow text-[#1a1a1a]" : "border-border-default bg-white text-text-muted"}`}>
                  <Icon size={15} />
                </div>
                <span className={`mt-2 whitespace-nowrap text-[11px] ${done ? "font-semibold text-text-heading" : "text-text-muted"}`}>{s.label}</span>
                {s.at && <span className="text-[11px] text-text-muted">{fmt(s.at)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* เลขพัสดุ */}
      {order.trackingNumber && (
        <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border-default bg-bg-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-text-muted">เลขพัสดุ{order.shippingPartner ? ` · ${order.shippingPartner}` : ""}</p>
            <p className="font-mono text-base font-semibold text-text-heading">{order.trackingNumber}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="btn-ghost min-h-0 py-2" aria-label="คัดลอกเลขพัสดุ">
              <Copy size={15} /> คัดลอก
            </button>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-0 py-2">
                <ExternalLink size={15} /> ติดตามพัสดุ
              </a>
            )}
          </div>
        </div>
      )}

      {(order.status === "DELIVERED" || order.status === "PICKED_UP" || order.status === "COMPLETED") && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-success-text"><PartyPopper size={15} /> ขอบคุณที่อุดหนุน DD Mobile!</p>
      )}
    </div>
  );
}
