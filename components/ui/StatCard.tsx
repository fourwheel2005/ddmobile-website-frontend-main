import CountUp from "@/components/CountUp";
import Tilt from "@/components/Tilt";
import type { LucideIcon } from "lucide-react";

/**
 * การ์ดสถิติมาตรฐานแอดมิน (แบบเดียวทั้งระบบ — เดิมมี 3 เวอร์ชัน)
 * ตัวเลขนับขึ้นด้วย CountUp เสมอ · หน่วยแสดงข้างตัวเลข (เลิก badge ปลอมที่หน้าตาเหมือน trend)
 * เอียง 3D เบา ๆ ตามเมาส์ (desktop) + ไอคอนยกลอย (translateZ) ให้ดูมีมิติ
 */
export default function StatCard({ icon: Icon, label, value, unit, prefix, iconClass = "text-yellow" }: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  iconClass?: string;
}) {
  return (
    <Tilt className="group h-full" max={6} scale={1.015} radius={16}>
      <div className="card-dd h-full">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl bg-bg-tinted ${iconClass} transition-transform duration-300 group-hover:scale-110`}
          style={{ transform: "translateZ(28px)" }}
        >
          <Icon size={22} />
        </div>
        <p className="mt-4 text-xs text-text-muted" style={{ transform: "translateZ(14px)" }}>{label}</p>
        <p className="flex items-baseline gap-1.5" style={{ transform: "translateZ(22px)" }}>
          <CountUp value={value} prefix={prefix} className="font-display text-4xl tabular-nums text-text-heading" />
          {unit && <span className="text-sm text-text-muted">{unit}</span>}
        </p>
      </div>
    </Tilt>
  );
}
