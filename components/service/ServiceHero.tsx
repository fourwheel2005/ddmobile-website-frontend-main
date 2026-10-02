import type { LucideIcon } from "lucide-react";

/** ส่วนหัวหน้าบริการ (ขายเครื่อง / ผ่อนบอลลูน / เลือกบริการ) — server component ไม่มี JS ฝั่ง client */
export default function ServiceHero({ badge, title, highlight, desc, points }: {
  badge: string;
  title: string;
  highlight: string;
  desc: string;
  points: { icon: LucideIcon; t: string; d: string }[];
}) {
  return (
    <section className="bg-bg-subtle">
      <div className="container-dd py-10 md:py-14">
        <span className="badge-dd badge-warning">{badge}</span>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-text-heading md:text-5xl">
          {title} <span className="text-yellow-hover">{highlight}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-text-muted md:text-lg">{desc}</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {points.map(({ icon: I, t, d }) => (
            <div key={t} className="flex items-start gap-3 rounded-2xl border border-border-default bg-white p-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-yellow/15 text-yellow-hover"><I size={20} /></span>
              <span><span className="block font-bold text-text-heading">{t}</span><span className="text-sm text-text-muted">{d}</span></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
