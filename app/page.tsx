"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
  Zap, ShieldCheck, Smartphone, CreditCard, Loader2,
  MessageCircle, Facebook, Instagram, Sparkles
} from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  capacity: string;
  description: string;
  price: number;
  imageUrl: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get("/products");
        setProducts(response.data.slice(0, 4));
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="page-wrapper flex min-h-screen flex-col bg-bg-base text-text-body">

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden border-b border-border-default bg-black px-4 pt-20 md:px-8 md:pt-28">
        {/* section number watermark */}
        <span className="pointer-events-none absolute right-2 top-4 select-none font-display text-[28vw] leading-[1.1] text-yellow opacity-[0.04] md:text-[18vw]">
          01
        </span>

        <div className="container-dd grid grid-cols-1 items-center gap-8 pb-16 md:grid-cols-[60%_40%] md:pb-24">
          {/* left: copy */}
          <div className="relative z-10">
            <p className="section-label">iPhone 17 Pro Max</p>
            <h1 className="font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.05] text-white">
              สีส้มไทเทเนียม<br />
              <span className="text-yellow">ผ่อนง่ายไม่ต้องรอ</span>
            </h1>
            <p className="mt-6 max-w-lg text-text-muted">
              อนุมัติไวใน 1 วัน · ไม่ต้องใช้บัตรเครดิต · เครื่องแท้ศูนย์ไทย 100%
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/products" className="btn-primary">เริ่มผ่อนเลย →</Link>
              <Link href="/products" className="btn-secondary">ดูรุ่นอื่น →</Link>
            </div>
          </div>

          {/* right: product image (flat, sharp frame) */}
          <div className="relative flex items-end justify-center">
            <div className="absolute inset-x-8 top-8 bottom-0 bg-yellow/5" aria-hidden="true" />
            <img
              src="/images/iphone-17-promax-orange.png"
              alt="iPhone 17 Pro Max"
              width={480}
              height={600}
              className="relative z-10 w-[70%] object-contain md:w-[90%]"
            />
          </div>
        </div>
      </section>

      {/* ===================== 3 STEPS (pure white contrast section) ===================== */}
      <section className="bg-white px-4 py-16 text-black md:px-8 md:py-24">
        <div className="container-dd">
          <h2 className="text-black font-display text-[clamp(2rem,6vw,4rem)] leading-[1.1]">
            3 ขั้นตอนง่ายๆ รับเครื่องทันที
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {steps.map((step, idx) => (
              <div key={idx} className="border border-black/15 p-6">
                <span className="font-display text-5xl text-black">{String(idx + 1).padStart(2, "0")}</span>
                <h3 className="text-black mt-4 font-display text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm text-black/70">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== WHY CHOOSE US ===================== */}
      <section className="border-b border-border-default px-4 py-16 md:px-8 md:py-24">
        <div className="container-dd">
          <p className="section-label">ทำไมต้องดีดีโมบาย</p>
          <h2 className="font-display text-[clamp(2rem,6vw,4rem)] leading-[1.1]">
            ร้านมือถือที่เข้าใจคุณมากที่สุด
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item, index) => (
              <div key={index} data-index={String(index + 1).padStart(2, "0")} className="card-dd group">
                <div className="mb-6 flex h-12 w-12 items-center justify-center bg-yellow text-black">
                  {item.icon}
                </div>
                <h3 className="card-title">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FEATURED PRODUCTS ===================== */}
      <section className="px-4 py-16 md:px-8 md:py-24">
        <div className="container-dd">
          <div className="mb-10 flex items-end justify-between border-b border-border-default pb-4">
            <div>
              <p className="section-label">อัปเดตสต็อกล่าสุด</p>
              <h2 className="font-display text-[clamp(2rem,6vw,4rem)] leading-[1.1]">สินค้าแนะนำ</h2>
            </div>
            <Link href="/products" className="nav-link whitespace-nowrap">ดูทั้งหมด →</Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-yellow">
              <Loader2 className="mb-4 h-10 w-10 animate-spin" />
              <p className="font-display uppercase tracking-widest">กำลังโหลดข้อมูลสินค้า</p>
            </div>
          ) : products.length === 0 ? (
            <div className="border border-dashed border-border-default py-20 text-center">
              <p className="font-display text-xl uppercase tracking-widest text-text-muted">ยังไม่มีสินค้าในระบบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <Link href={`/products/${product.id}`} key={product.id} className="card-dd group flex flex-col p-3">
                  <div className="relative mb-4 flex aspect-[4/5] items-center justify-center overflow-hidden bg-black p-4">
                    <span className="badge-dd badge-warning absolute left-3 top-3 z-10">มือ 1 ศูนย์ไทย</span>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <Smartphone size={50} className="text-white/5" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-2 pb-2">
                    <h3 className="font-display text-xl uppercase leading-tight text-white transition-colors group-hover:text-yellow">{product.name}</h3>
                    <p className="mb-4 line-clamp-1 text-xs text-text-muted">
                      ความจุ {product.capacity || "-"} · {product.description || "เครื่องใหม่"}
                    </p>
                    <div className="mt-auto flex items-end justify-between border-t border-border-default pt-3">
                      <div>
                        <p className="font-display text-[10px] uppercase tracking-widest text-text-muted">ราคาเริ่มต้น</p>
                        <p className="font-display text-2xl tabular-nums text-yellow">฿{product.price ? product.price.toLocaleString() : "0"}</p>
                      </div>
                      <span className="font-display text-yellow">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="px-4 py-16 md:px-8 md:py-24">
        <div className="container-dd">
          <div className="relative overflow-hidden bg-yellow px-6 py-12 text-black md:px-16 md:py-20">
            <span className="pointer-events-none absolute -right-4 -top-6 select-none font-display text-[12rem] leading-[1.1] text-black opacity-[0.06]">→</span>
            <h2 className="text-black font-display text-[clamp(2rem,6vw,4rem)] leading-[1.1]">พร้อมเป็นเจ้าของเครื่องใหม่แล้วหรือยัง?</h2>
            <p className="mt-4 max-w-2xl text-sm text-black/70 md:text-base">
              ไม่ต้องรอเก็บเงินก้อน ทักแชทหาแอดมินวันนี้ ประเมินสิทธิ์ฟรี ไม่มีค่าใช้จ่ายแอบแฝง
            </p>
            <a href="https://lin.ee/Zsq9ja0" target="_blank" rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 bg-black px-8 py-4 font-display uppercase tracking-widest text-yellow shadow-[3px_3px_0_#997700] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[2px] active:translate-y-[2px]">
              <MessageCircle size={20} /> ทักไลน์สอบถามเลย →
            </a>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ===================== */}
      <footer className="border-t border-border-default bg-black px-4 pb-10 pt-16 md:px-8">
        <div className="container-dd grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="mb-4 inline-block">
              <img src="/images/logo.png" alt="DDMOBILE Logo" width={120} height={48} className="h-12 w-auto object-contain" />
            </Link>
            <p className="max-w-sm text-sm text-text-muted">
              ผู้นำด้านบริการผ่อนโทรศัพท์มือถือและสินค้าไอที อนุมัติไว เงื่อนไขง่าย เข้าถึงได้ทุกคน
            </p>
          </div>
          <div>
            <p className="section-label">เมนูทางลัด</p>
            <ul className="space-y-3 text-sm">
              <li><Link href="/" className="text-text-muted hover:text-yellow">หน้าหลัก →</Link></li>
              <li><Link href="/products" className="text-text-muted hover:text-yellow">สินค้าทั้งหมด →</Link></li>
              <li><Link href="/installments" className="text-text-muted hover:text-yellow">ขั้นตอนการผ่อน →</Link></li>
              <li><Link href="/contact" className="text-text-muted hover:text-yellow">ติดต่อเรา →</Link></li>
            </ul>
          </div>
          <div>
            <p className="section-label">ติดตามเรา</p>
            <div className="flex flex-col gap-3">
              <a href="https://www.facebook.com/profile.php?id=100092013667930&locale=th_TH" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 border border-border-default p-3 transition-colors hover:border-yellow">
                <Facebook size={20} className="text-yellow" />
                <span className="text-sm text-text-body">ทันใจ ทันใช้ ไอโฟนผ่อนง่าย</span>
              </a>
              <a href="https://www.instagram.com/ddmobileplus/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 border border-border-default p-3 transition-colors hover:border-yellow">
                <Instagram size={20} className="text-yellow" />
                <span className="text-sm text-text-body">ddmobileplus</span>
              </a>
            </div>
          </div>
        </div>
        <div className="container-dd mt-12 border-t border-border-default pt-6 text-center font-display text-xs uppercase tracking-widest text-text-muted">
          © {new Date().getFullYear()} DDMOBILE. All rights reserved.
        </div>
      </footer>
    </div>
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
  { icon: <CreditCard size={22} />, title: "ไม่ต้องมีบัตร", desc: "อาชีพไหนก็ผ่อนได้ นักศึกษา อาชีพอิสระ พนักงานประจำ" },
  { icon: <Sparkles size={22} />, title: "โคตรใช่!", desc: "เปิดมาก็รู้เลยว่าใช่ บริการประทับใจ ดูแลหลังการขาย ลูกค้าบอกต่อไม่ขาด" }
];
