"use client";
import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { LINE_URL } from "@/lib/contact";
import { buildInstLookup, type InstallmentPlan, type InstallmentSerial, type InstInfo } from "@/lib/installment";
import {
  Zap, ShieldCheck, Smartphone, CreditCard,
  MessageCircle, ChevronRight, Sparkles, RotateCcw
} from "lucide-react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import HeroPhone from "@/components/HeroPhone";
import PromoCarousel from "@/components/PromoCarousel";
import { ProductGridSkeleton } from "@/components/Skeletons";

interface CatalogItem {
  id: string;
  type: string;
  productName: string;
  brand: string;
  color: string | null;
  storage: string | null;
  condition: string;
  conditionLabel: string;
  minPrice: number | null;
  imageUrl: string | null;
  options?: ({ storage: string | null } | null)[] | null;
}

export default function Home() {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [serials, setSerials] = useState<InstallmentSerial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [cat, plan, ser] = await Promise.all([
          api.get("/catalog"),
          api.get("/installment/plans").catch(() => ({ data: [] })),
          api.get("/installment/serials").catch(() => ({ data: [] })),
        ]);
        setProducts((Array.isArray(cat.data) ? cat.data : []).slice(0, 4));
        setPlans(Array.isArray(plan.data) ? plan.data : []);
        setSerials(Array.isArray(ser.data) ? ser.data : []);
      } catch (error) {
        console.error("Error fetching catalog:", error);
        setLoadError(true);   // โชว์ error จริง — ไม่หลอกผู้ใช้ว่า "ยังไม่มีสินค้า"
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const instFor = useMemo(() => buildInstLookup(plans, serials), [plans, serials]);

  return (
    <div className="page-wrapper flex min-h-screen flex-col bg-bg-base text-text-body">

      {/* ===================== HERO ===================== */}
      <section className="bg-bg-subtle">
        <div className="container-dd grid grid-cols-1 items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div>
            <p className="section-label">iPhone 17 Pro Max</p>
            <h1 className="text-[clamp(2rem,5vw,3.25rem)] font-bold leading-tight text-text-heading">
              สีส้มไทเทเนียมใหม่ <span className="rounded-lg bg-yellow px-2 text-text-heading">ผ่อนง่ายไม่ต้องรอ</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-text-muted md:text-lg">
              อนุมัติไวใน 1 วัน · ไม่ต้องใช้บัตรเครดิต · เครื่องแท้ศูนย์ไทย 100%
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/products" className="btn-primary px-7 py-3 text-base">เริ่มผ่อนเลย</Link>
              <Link href="/products" className="btn-secondary px-7 py-3 text-base">ดูรุ่นอื่น</Link>
            </div>
          </div>

          <HeroPhone />
        </div>
      </section>

      {/* ===================== PROMO CAROUSEL ===================== */}
      <PromoCarousel />

      {/* ===================== 3 STEPS ===================== */}
      <section className="container-dd py-12 md:py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-text-heading md:text-3xl">3 ขั้นตอนง่ายๆ รับเครื่องทันที</h2>
          <p className="mt-2 text-text-muted">ผ่อนไอโฟนไม่ยุ่งยาก ทำตามนี้ได้เลย</p>
        </div>
        <Reveal className="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={idx} className="card-dd text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow text-lg font-bold text-text-heading">
                {idx + 1}
              </div>
              <h3 className="mb-2 text-lg font-bold text-text-heading">{step.title}</h3>
              <p className="text-sm text-text-muted">{step.desc}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ===================== WHY CHOOSE US ===================== */}
      <section className="bg-bg-subtle py-12 md:py-16">
        <div className="container-dd">
          <div className="mb-8 text-center">
            <p className="section-label justify-center">ทำไมต้องดีดีโมบาย</p>
            <h2 className="text-2xl font-bold text-text-heading md:text-3xl">ร้านมือถือที่เข้าใจคุณมากที่สุด</h2>
          </div>
          <Reveal className="reveal-stagger grid grid-cols-1 gap-5 sm:grid-cols-3">
            {features.map((item, index) => (
              <div key={index} className="card-dd">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow text-text-heading">
                  {item.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-text-heading">{item.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{item.desc}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ===================== FEATURED PRODUCTS ===================== */}
      <section className="container-dd py-12 md:py-16">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="section-label">อัปเดตสต็อกล่าสุด</p>
            <h2 className="text-2xl font-bold text-text-heading md:text-3xl">สินค้าแนะนำ</h2>
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm font-semibold text-yellow-hover hover:underline">
            ดูทั้งหมด <ChevronRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : loadError ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-subtle py-16 text-center">
            <Smartphone size={40} className="mx-auto mb-3 text-text-disabled" />
            <p className="font-bold text-text-heading">โหลดสินค้าไม่สำเร็จ</p>
            <p className="mt-1 text-sm text-text-muted">กรุณาลองใหม่อีกครั้ง หรือทักไลน์สอบถามได้เลย</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default py-16 text-center text-text-muted">
            ยังไม่มีสินค้าในระบบ
          </div>
        ) : (
          <Reveal className="reveal-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} inst={instFor(product)} />
            ))}
          </Reveal>
        )}
      </section>

      {/* ===================== CTA ===================== */}
      <section className="container-dd pb-12 md:pb-16">
        <Reveal>
        <div className="rounded-3xl bg-yellow px-6 py-10 text-center md:px-16 md:py-14">
          <h2 className="text-2xl font-bold text-text-heading md:text-3xl">พร้อมเป็นเจ้าของเครื่องใหม่แล้วหรือยัง?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-text-heading/70 md:text-base">
            ไม่ต้องรอเก็บเงินก้อน ทักแชทหาแอดมินวันนี้ ประเมินสิทธิ์ฟรี ไม่มีค่าใช้จ่ายแอบแฝง
          </p>
          <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-text-heading px-7 py-3 font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5">
            <MessageCircle size={20} /> ทักไลน์สอบถามเลย
          </a>
        </div>
        </Reveal>
      </section>

    </div>
  );
}

function ProductCard({ product, inst }: { product: CatalogItem; inst?: InstInfo | null }) {
  const isNew = product.condition === "NEW";
  return (
    <Link href={`/products/${encodeURIComponent(product.id)}`} className="card-dd group flex flex-col overflow-hidden !p-0">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-bg-subtle p-4">
        <span className={`badge-dd absolute left-3 top-3 z-10 ${isNew ? "badge-success" : "badge-info"}`}>
          {isNew ? <Sparkles size={11} /> : <RotateCcw size={11} />} {product.conditionLabel}
        </span>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.productName} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <Smartphone size={48} className="text-text-disabled" />
        )}
        {inst?.down != null && (
          <span className="absolute bottom-0 left-0 z-10 rounded-tr-xl bg-text-heading px-3 py-1.5 text-xs font-bold text-white shadow-md">
            ดาวน์ <span className="text-yellow">฿{inst.down.toLocaleString()}</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-text-heading group-hover:text-yellow-hover">{product.productName}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-text-muted">
          {[product.color, product.storage].filter(Boolean).join(" · ") || product.brand}
        </p>
        <div className="mt-auto pt-3">
          <p className="text-xs text-text-muted">ราคา</p>
          <p className="text-lg font-bold text-price">{product.minPrice != null ? "฿" + product.minPrice.toLocaleString() : "-"}</p>
          {inst?.monthly != null && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-yellow/15 px-2 py-1.5 text-xs font-bold text-text-heading">
              <CreditCard size={13} className="flex-shrink-0 text-yellow-hover" />
              ผ่อนเริ่ม ฿{inst.monthly.toLocaleString()}<span className="font-medium text-text-muted">/เดือน</span>
            </div>
          )}
          {inst?.note && <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-yellow-hover"><Sparkles size={11} className="flex-shrink-0" /> <span className="line-clamp-1">{inst.note}</span></p>}
        </div>
      </div>
    </Link>
  );
}

const steps = [
  { title: "ทักแชทหาแอดมิน", desc: "เลือกเครื่องรุ่นที่ชอบ ส่งเอกสารตรวจสอบสิทธิ์เบื้องต้น" },
  { title: "ยืนยันตัวตน", desc: "ใช้เพียงบัตรประชาชนใบเดียว อนุมัติไวใน 24 ชม." },
  { title: "รับเครื่องทันที", desc: "นัดรับเครื่องที่หน้าร้าน หรือจัดส่งด่วนถึงหน้าบ้าน" }
];

const features = [
  { icon: <Zap size={22} />, title: "อนุมัติไว", desc: "ยื่นเรื่องเช้า ได้เครื่องเย็น ไม่ต้องรอนานให้เสียเวลา" },
  { icon: <ShieldCheck size={22} />, title: "มั่นใจ 100%", desc: "เครื่องแท้แกะกล่อง ประกันศูนย์ Apple ประเทศไทย 1 ปีเต็ม" },
  { icon: <CreditCard size={22} />, title: "ไม่ต้องมีบัตร", desc: "อาชีพไหนก็ผ่อนได้ นักศึกษา อาชีพอิสระ พนักงานประจำ" }
];
