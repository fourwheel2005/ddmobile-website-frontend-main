"use client";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

/**
 * ไทม์ไลน์ + สิ่งที่ต้องทำต่อ ที่ "server รับรอง" (S12/UX-02)
 *
 * ทุกขั้น/สถานะ done มาจาก backend (derive จาก timestamp จริง) — ฝั่งนี้แค่วาด ไม่เดา transition เอง
 */
export interface TimelineStep { type: string; label: string; occurredAt: string | null; done: boolean }
export interface NextAction { type: string; label: string; deadline: string | null; href: string }

const timeText = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function OrderTimeline({
  timeline, nextAction,
}: { timeline?: TimelineStep[] | null; nextAction?: NextAction | null }) {
  if (!timeline || timeline.length === 0) return null;

  // ขั้นถัดไปที่ยังไม่ทำ = ตัวแรกที่ done=false → ไฮไลต์ให้ลูกค้ารู้ว่าอยู่ตรงไหน
  const currentIdx = timeline.findIndex((s) => !s.done);

  return (
    <div className="card-dd">
      <h2 className="mb-4 font-bold text-text-heading">สถานะคำสั่งซื้อ</h2>

      <ol className="space-y-0">
        {timeline.map((step, i) => {
          const isCurrent = i === currentIdx;
          const last = i === timeline.length - 1;
          return (
            <li key={step.type} className="flex gap-3">
              <div className="flex flex-col items-center">
                {step.done
                  ? <CheckCircle2 size={20} className="text-success-text" />
                  : <Circle size={20} className={isCurrent ? "text-yellow-hover" : "text-text-disabled"} />}
                {!last && <span className={`w-0.5 flex-1 ${step.done ? "bg-success-text/40" : "bg-border-default"}`} style={{ minHeight: 18 }} />}
              </div>
              <div className={`pb-4 ${last ? "pb-0" : ""}`}>
                <p className={`text-sm ${step.done ? "font-semibold text-text-heading" : isCurrent ? "font-semibold text-yellow-hover" : "text-text-muted"}`}>
                  {step.label}
                </p>
                {step.occurredAt && <p className="text-xs text-text-muted">{timeText(step.occurredAt)}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* สิ่งที่ต้องทำต่อ — server เป็นผู้บอก (null = รอฝั่งร้าน ไม่ต้องรบกวนลูกค้า) */}
      {nextAction && (
        <Link
          href={nextAction.href}
          className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-yellow bg-yellow/10 px-4 py-3 text-sm font-semibold text-text-heading transition-colors hover:bg-yellow/20"
        >
          <span>{nextAction.label}</span>
          <ArrowRight size={16} className="flex-shrink-0 text-yellow-hover" />
        </Link>
      )}
    </div>
  );
}
