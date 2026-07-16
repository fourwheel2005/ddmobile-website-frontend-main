"use client";
import { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";
import api from "@/lib/api";
import Reveal from "@/components/Reveal";

interface Review { id: number; displayName: string; rating: number; comment: string | null; productName: string | null; images?: string[]; createdAt: string | null; }
interface Summary { average: number; count: number; reviews: Review[]; }

const Stars = ({ n, size = 15 }: { n: number; size?: number }) => (
  <span className="inline-flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={size} className={i <= n ? "fill-yellow text-yellow" : "text-border-default"} />
    ))}
  </span>
);

/** รีวิวจากลูกค้าที่ซื้อจริง (ไม่มีรีวิว = ไม่โชว์ section — ไม่มีของปลอม) */
export default function ReviewsSection() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    api.get("/reviews/public")
      .then((r) => setData(r.data))
      .catch(() => { /* endpoint ยังไม่พร้อม/ล่ม → ซ่อน section */ });
  }, []);

  if (!data || data.count === 0) return null;

  return (
    <section className="border-t border-border-default bg-bg-subtle py-12 md:py-16">
      <div className="container-dd">
        <Reveal>
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="section-label">จากลูกค้าที่ซื้อและรับเครื่องแล้วเท่านั้น</p>
              <h2 className="text-2xl font-bold text-text-heading md:text-3xl">รีวิวจากลูกค้าจริง</h2>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border-default bg-white px-5 py-3">
              <span className="font-display text-4xl font-bold text-text-heading">{data.average.toFixed(1)}</span>
              <span className="flex flex-col">
                <Stars n={Math.round(data.average)} />
                <span className="text-xs text-text-muted">{data.count.toLocaleString()} รีวิว</span>
              </span>
            </div>
          </div>
        </Reveal>
        <Reveal className="reveal-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reviews.slice(0, 6).map((r) => (
            <div key={r.id} className="card-dd">
              <div className="flex items-center justify-between">
                <Stars n={r.rating} />
                <Quote size={20} className="fill-yellow/20 text-yellow-hover" />
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-text-body">
                {r.comment || `ให้คะแนน ${r.rating} ดาว`}
              </p>
              {(r.images?.length ?? 0) > 0 && (
                <div className="mt-2 flex gap-1.5">
                  {r.images!.slice(0, 3).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="รูปรีวิวจากลูกค้า" loading="lazy" className="h-14 w-14 rounded-lg border border-border-subtle object-cover" />
                  ))}
                </div>
              )}
              <div className="mt-4 border-t border-border-subtle pt-3 text-xs text-text-muted">
                <p className="font-semibold text-text-heading">{r.displayName}</p>
                <p className="mt-0.5 line-clamp-1">
                  {r.productName ?? "สินค้า DD Mobile"}
                  {r.createdAt && ` · ${new Date(r.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}`}
                </p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
