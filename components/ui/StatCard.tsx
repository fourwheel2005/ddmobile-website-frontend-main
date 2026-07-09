import CountUp from "@/components/CountUp";
import type { LucideIcon } from "lucide-react";

/**
 * การ์ดสถิติมาตรฐานแอดมิน (แบบเดียวทั้งระบบ — เดิมมี 3 เวอร์ชัน)
 * ตัวเลขนับขึ้นด้วย CountUp เสมอ · หน่วยแสดงข้างตัวเลข (เลิก badge ปลอมที่หน้าตาเหมือน trend)
 */
export default function StatCard({ icon: Icon, label, value, unit, iconClass = "text-yellow" }: {
  icon: LucideIcon;
  label: string;
  value: number;
  unit?: string;
  iconClass?: string;
}) {
  return (
    <div className="card-dd">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-bg-tinted ${iconClass}`}>
        <Icon size={22} />
      </div>
      <p className="mt-4 text-xs text-text-muted">{label}</p>
      <p className="flex items-baseline gap-1.5">
        <CountUp value={value} className="font-display text-4xl tabular-nums text-text-heading" />
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </p>
    </div>
  );
}
