"use client";
import { useState } from "react";
import { baht } from "@/lib/money";

export interface DailySales {
  date: string;   // YYYY-MM-DD
  total: number;
  bills: number;
}

const DAY_LABEL = (d: string) => {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
};

/**
 * กราฟแท่งยอดขายรายวัน (series เดียว — ไม่ต้องมี legend, ชื่อการ์ดบอกอยู่แล้ว)
 * - แท่งสี ink เข้ม คอนทราสต์สูงบนพื้นขาว · "วันนี้" ไฮไลต์เหลืองแบรนด์ + จุดสีที่ label
 * - มุมมนเฉพาะปลายแท่ง (ฐานชนแกน) · ช่องไฟระหว่างแท่ง · กริดจาง 3 เส้น
 * - hover ทั้งคอลัมน์ (hit target ใหญ่กว่าแท่ง) → tooltip ค่า + จำนวนบิล
 * - direct label เฉพาะจุดสำคัญ: แท่งสูงสุด (ไม่ใส่เลขทุกแท่ง)
 */
export default function SalesChart({ data }: { data: DailySales[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const W = 720, H = 190, PAD_T = 26, PAD_B = 26, PAD_X = 8;
  const plotH = H - PAD_T - PAD_B;
  const max = Math.max(...data.map((d) => d.total), 1);
  const n = data.length;
  const slot = (W - PAD_X * 2) / n;
  const barW = Math.min(34, Math.max(10, slot * 0.55));
  const maxIdx = data.reduce((m, d, i) => (d.total > data[m].total ? i : m), 0);
  const todayIdx = n - 1;

  const x = (i: number) => PAD_X + slot * i + (slot - barW) / 2;
  const y = (v: number) => PAD_T + plotH * (1 - v / max);
  const h = (v: number) => Math.max(v > 0 ? 3 : 0, plotH * (v / max));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="กราฟยอดขายรายวัน">
        {/* กริดจาง 3 เส้น + ป้ายค่าแบบ muted */}
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD_X} x2={W - PAD_X} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-border-subtle)" strokeWidth={1} />
            <text x={PAD_X} y={y(max * f) - 4} fontSize={10} fill="var(--color-text-disabled)">{baht(Math.round(max * f))}</text>
          </g>
        ))}
        <line x1={PAD_X} x2={W - PAD_X} y1={PAD_T + plotH} y2={PAD_T + plotH} stroke="var(--color-border-default)" strokeWidth={1} />

        {data.map((d, i) => {
          const isToday = i === todayIdx;
          const active = hover === i;
          return (
            <g key={d.date}
               onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* hit target ทั้งคอลัมน์ (ใหญ่กว่าแท่ง) */}
              <rect x={PAD_X + slot * i} y={PAD_T} width={slot} height={plotH} fill="transparent" />
              {active && <rect x={PAD_X + slot * i} y={PAD_T} width={slot} height={plotH} fill="var(--color-bg-tinted)" opacity={0.6} />}
              {/* แท่ง: ปลายมน ฐานชนแกน (เว้นช่องไฟด้วย barW < slot) */}
              <path
                d={`M ${x(i)} ${PAD_T + plotH}
                    V ${y(d.total) + 4}
                    Q ${x(i)} ${y(d.total)} ${x(i) + 4} ${y(d.total)}
                    H ${x(i) + barW - 4}
                    Q ${x(i) + barW} ${y(d.total)} ${x(i) + barW} ${y(d.total) + 4}
                    V ${PAD_T + plotH} Z`}
                fill={isToday ? "var(--color-yellow)" : "var(--color-text-heading)"}
                opacity={hover == null || active ? 1 : 0.45}
                style={{ transition: "opacity .15s" }}
              />
              {d.total === 0 && <line x1={x(i)} x2={x(i) + barW} y1={PAD_T + plotH} y2={PAD_T + plotH} stroke="var(--color-border-default)" strokeWidth={2} />}
              {/* direct label เฉพาะแท่งสูงสุด */}
              {i === maxIdx && d.total > 0 && !active && (
                <text x={x(i) + barW / 2} y={y(d.total) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-text-heading)">
                  {baht(d.total)}
                </text>
              )}
              {/* ป้ายวัน: เว้นทีละวันถ้าแน่น · วันนี้เป็นตัวหนา */}
              {(n <= 8 || i % 2 === todayIdx % 2) && (
                <text x={PAD_X + slot * i + slot / 2} y={H - 8} textAnchor="middle" fontSize={10}
                      fontWeight={isToday ? 700 : 400}
                      fill={isToday ? "var(--color-text-heading)" : "var(--color-text-muted)"}>
                  {isToday ? "วันนี้" : DAY_LABEL(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-border-default bg-white px-3 py-2 text-xs shadow-[var(--shadow-hover)]"
          style={{ left: `${((PAD_X + slot * hover + slot / 2) / W) * 100}%`, top: 0 }}
        >
          <p className="font-semibold text-text-heading">{DAY_LABEL(data[hover].date)}</p>
          <p className="tabular-nums text-text-body">{baht(data[hover].total)} · {data[hover].bills} บิล</p>
        </div>
      )}
    </div>
  );
}
