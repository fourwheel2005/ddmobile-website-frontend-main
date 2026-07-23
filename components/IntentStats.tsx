"use client";
import { useEffect, useMemo, useState } from "react";
import { Target, Sparkles, RotateCcw, Banknote, Repeat, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import StatCard from "@/components/ui/StatCard";
import { TableSkeleton } from "@/components/Skeletons";

interface IntentStat { service: string; label: string; count: number; }

// ไอคอนต่อบริการ (ให้ตรงกับ IntentGate)
const ICON: Record<string, LucideIcon> = {
  NEW: Sparkles, USED: RotateCcw, CASH: Banknote, TRADE: Repeat,
};

/** แดชบอร์ด "บริการที่ลูกค้าสนใจ" — สรุปดีมานด์จากป๊อปอัพคัดกรอง (bar เทียบสัดส่วน) */
export default function IntentStats() {
  const [stats, setStats] = useState<IntentStat[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get("/admin/intent/stats")
      .then((r) => setStats(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError(true));
  }, []);

  const { ranked, total, max } = useMemo(() => {
    const list = stats ?? [];
    const total = list.reduce((s, x) => s + x.count, 0);
    const max = Math.max(1, ...list.map((x) => x.count));
    const ranked = [...list].sort((a, b) => b.count - a.count);   // มากสุดขึ้นก่อน
    return { ranked, total, max };
  }, [stats]);

  if (error) {
    return <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-16 text-center text-text-muted">โหลดสถิติไม่สำเร็จ</div>;
  }
  if (!stats) {
    return <div className="overflow-hidden rounded-2xl border border-border-default bg-white"><TableSkeleton rows={5} cols={2} /></div>;
  }

  const top = ranked[0];

  return (
    <div className="space-y-5">
      {/* การ์ดสรุป */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Users} label="ลูกค้าเลือกบริการทั้งหมด" value={total} unit="ครั้ง" iconClass="text-yellow" />
        <StatCard icon={ICON[top?.service] ?? Target} label="บริการที่สนใจมากสุด" value={top?.count ?? 0} unit={total > 0 ? `ครั้ง · ${top?.label ?? "-"}` : "ครั้ง"} iconClass="text-success-text" />
      </div>

      {/* bar เทียบต่อบริการ */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-white">
        <div className="flex items-center gap-2 border-b border-border-default bg-bg-surface p-4">
          <Target className="text-yellow" size={20} />
          <h2 className="font-display text-xl">บริการที่ลูกค้าสนใจ (จากป๊อปอัพคัดกรอง)</h2>
        </div>

        {total === 0 ? (
          <div className="py-16 text-center">
            <Target size={40} className="mx-auto mb-3 text-text-disabled" />
            <p className="font-bold text-text-heading">ยังไม่มีข้อมูล</p>
            <p className="mt-1 text-sm text-text-muted">เมื่อลูกค้าเลือกบริการจากป๊อปอัพ ข้อมูลจะสรุปที่นี่</p>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            {ranked.map((s, i) => {
              const Icon = ICON[s.service] ?? Target;
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              const barPct = (s.count / max) * 100;
              return (
                <div key={s.service}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-text-heading">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${i === 0 ? "bg-yellow/25 text-yellow-hover" : "bg-bg-subtle text-text-muted"}`}>
                        <Icon size={15} />
                      </span>
                      {s.label}
                    </span>
                    <span className="flex-shrink-0 tabular-nums text-text-muted">
                      <span className="font-bold text-text-heading">{s.count.toLocaleString()}</span> ครั้ง · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-bg-subtle">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${i === 0 ? "bg-yellow" : "bg-text-heading/70"}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
