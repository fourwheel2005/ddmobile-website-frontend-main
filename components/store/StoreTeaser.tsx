"use client";
/* eslint-disable @next/next/no-img-element -- รูปจาก backend (ย่อแล้ว) */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import api from "@/lib/api";
import Reveal from "@/components/Reveal";
import type { StoreGallery, StorePhoto } from "@/lib/storeGallery";

/**
 * หน้าแรก: "ร้านจริง ทีมงานจริง" — รูปหน้าร้าน + ทีมงาน 4 ช่องเท่ากัน พาไปหน้าเกี่ยวกับเรา
 * ยังไม่มีรูปในหลังบ้าน = ไม่แสดงทั้ง section
 */
export default function StoreTeaser() {
  const [photos, setPhotos] = useState<StorePhoto[]>([]);
  useEffect(() => {
    api.get<StoreGallery>("/store-gallery")
      .then((r) => {
        const g = r.data.photos ?? {};
        setPhotos([...(g.STORE ?? []), ...(g.TEAM ?? []), ...(g.TECHNICIAN ?? [])].slice(0, 4));
      })
      .catch(() => { /* ไม่มี/ล่ม → ซ่อน */ });
  }, []);

  if (photos.length === 0) return null;
  const cols = photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : photos.length === 3 ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4";

  return (
    <section className="container-dd py-12 md:py-16">
      <Reveal>
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="section-label">มีหน้าร้านจริง</p>
            <h2 className="text-2xl font-bold text-text-heading md:text-3xl">ร้านจริง ทีมงานตัวจริง</h2>
            <p className="mt-1 text-sm text-text-muted">แวะมาดูเครื่อง ตรวจสภาพ และทำสัญญาที่ร้านได้</p>
          </div>
          <Link href="/contact#store" className="btn-ghost">ดูหน้าร้านและทีมงาน <ArrowRight size={16} /></Link>
        </div>
      </Reveal>
      <Reveal className={`reveal-stagger grid ${cols} gap-3 md:gap-4`}>
        {photos.map((p) => (
          <Link key={p.id} href={p.category === "STORE" ? "/contact#store" : p.category === "TEAM" ? "/contact#team" : "/contact#technicians"}
                className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-bg-subtle">
            <img src={p.url} alt={p.title ?? "หน้าร้าน DD Mobile"} loading="lazy" decoding="async"
                 className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
            {(p.title || p.subtitle) && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-white">
                {p.title && <span className="block text-sm font-semibold">{p.title}</span>}
                {p.subtitle && <span className="block text-xs text-white/75">{p.subtitle}</span>}
              </span>
            )}
          </Link>
        ))}
      </Reveal>
      <div className="mt-6 text-center">
        <Link href="/contact#directions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-heading underline-offset-4 hover:underline">
          <MapPin size={15} className="text-yellow-hover" /> ดูเส้นทางการเดินทางมาร้าน
        </Link>
      </div>
    </section>
  );
}
