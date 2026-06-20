"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Smartphone, Loader2, ShieldCheck, CheckCircle2, XCircle,
  MessageCircle, FileSignature, ArrowLeft, ChevronRight, Sparkles, RotateCcw, BatteryMedium
} from "lucide-react";
import toast from "react-hot-toast";
import CountUp from "@/components/CountUp";

interface CatalogItem {
  id: string;
  variantId: string;
  productName: string;
  brand: string;
  sku: string;
  color: string | null;
  storage: string | null;
  condition: string;
  conditionLabel: string;
  quantity: number;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl: string | null;
  avgBatteryHealth: number | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const raw = Array.isArray(params.id) ? params.id[0] : params.id;
        const id = decodeURIComponent(raw || "");
        const res = await api.get("/catalog");
        const found = (res.data as CatalogItem[]).find((c) => c.id === id) || null;
        setItem(found);
        if (!found) toast.error("ไม่พบสินค้านี้");
      } catch (error) {
        console.error("Error fetching item:", error);
        toast.error("โหลดข้อมูลสินค้าไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) fetchItem();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-yellow-hover">
        <Loader2 size={44} className="animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 text-center">
        <Smartphone size={56} className="mb-5 text-text-disabled" />
        <h1 className="text-2xl font-bold text-text-heading">ไม่พบสินค้านี้</h1>
        <p className="mb-7 mt-2 text-sm text-text-muted">สินค้าอาจถูกขายไปแล้ว หรือ URL ไม่ถูกต้อง</p>
        <Link href="/products" className="btn-primary">ดูสินค้าทั้งหมด</Link>
      </div>
    );
  }

  const isNew = item.condition === "NEW";
  const installment = item.minPrice ? Math.ceil(item.minPrice / 10) : 0;

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd pt-6 pb-36 md:py-10">

        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-text-muted">
          <Link href="/" className="hover:text-text-heading">หน้าหลัก</Link>
          <ChevronRight size={14} />
          <Link href="/products" className="hover:text-text-heading">สินค้าทั้งหมด</Link>
          <ChevronRight size={14} />
          <span className="line-clamp-1 font-medium text-text-heading">{item.productName}</span>
        </nav>

        <button onClick={() => router.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-heading">
          <ArrowLeft size={18} /> ย้อนกลับ
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* image */}
          <div className="relative flex aspect-square items-center justify-center rounded-2xl border border-border-default bg-white p-8">
            <span className={`badge-dd absolute left-5 top-5 z-10 ${isNew ? "badge-success" : "badge-info"}`}>
              {isNew ? <Sparkles size={12} /> : <RotateCcw size={12} />} {item.conditionLabel}
            </span>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.productName} width={420} height={420} className="h-full w-full max-w-sm object-contain" />
            ) : (
              <Smartphone size={120} className="text-text-disabled" />
            )}
          </div>

          {/* info */}
          <div className="flex flex-col">
            <p className="text-sm font-medium text-text-muted">{item.brand}</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-text-heading md:text-3xl">{item.productName}</h1>

            <div className="my-5 flex flex-wrap gap-2">
              {item.quantity > 0 ? (
                <span className="badge-dd badge-success"><CheckCircle2 size={14} /> พร้อมส่ง (เหลือ {item.quantity} เครื่อง)</span>
              ) : (
                <span className="badge-dd badge-error"><XCircle size={14} /> สินค้าหมดชั่วคราว</span>
              )}
              {item.avgBatteryHealth != null && (
                <span className="badge-dd badge-warning"><BatteryMedium size={14} /> แบตเฉลี่ย {item.avgBatteryHealth}%</span>
              )}
            </div>

            <div className="rounded-2xl border border-border-default bg-bg-subtle p-5">
              <p className="text-sm text-text-muted">ราคา{isNew ? "เครื่องใหม่" : "เครื่องมือสอง"}</p>
              <div className="flex items-baseline gap-2">
                <CountUp value={item.minPrice || 0} prefix="฿" className="text-3xl font-bold text-price md:text-4xl" />
                {item.maxPrice != null && item.maxPrice !== item.minPrice && (
                  <span className="text-lg text-text-muted">- ฿{Number(item.maxPrice).toLocaleString()}</span>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-border-default pt-4 text-sm">
                <span className="text-text-muted">ผ่อนเริ่มต้นเพียง</span>
                <span className="text-lg font-bold text-text-heading"><CountUp value={installment} prefix="฿" /> / เดือน</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-bold text-text-heading">รายละเอียด</h3>
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">สภาพเครื่อง</span><span className="col-span-2 font-medium text-text-heading">{item.conditionLabel}</span></div>
              {item.color && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">สี</span><span className="col-span-2 font-medium text-text-heading">{item.color}</span></div>}
              {item.storage && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">ความจุ</span><span className="col-span-2 font-medium text-text-heading">{item.storage}</span></div>}
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">SKU</span><span className="col-span-2 font-mono text-xs text-text-body">{item.sku}</span></div>
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">การรับประกัน</span><span className="col-span-2 flex items-center gap-2 font-medium text-success-text"><ShieldCheck size={16} /> {isNew ? "ประกันศูนย์ 1 ปี" : "ตรวจเช็คคุณภาพแล้ว"}</span></div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button disabled={item.quantity <= 0} className="btn-primary flex-1 py-3.5 text-base" onClick={() => toast("กำลังพาท่านไปหน้าฟอร์มผ่อนสินค้า...", { icon: "🚀" })}>
                <FileSignature size={20} /> {item.quantity > 0 ? "ยื่นเรื่องผ่อนรุ่นนี้" : "สินค้าหมด"}
              </button>
              <a href="https://lin.ee/Zsq9ja0" target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 py-3.5 text-base">
                <MessageCircle size={20} /> สอบถามแอดมิน
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA (มือถือ) */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[80] flex items-center gap-3 border-t border-border-default bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex-shrink-0">
          <p className="text-[11px] text-text-muted">ราคา</p>
          <p className="text-lg font-bold leading-none text-price">{item.minPrice ? "฿" + item.minPrice.toLocaleString() : "-"}</p>
        </div>
        <button disabled={item.quantity <= 0} onClick={() => toast("กำลังพาท่านไปหน้าฟอร์มผ่อนสินค้า...", { icon: "🚀" })} className="btn-primary flex-1 py-3">
          <FileSignature size={18} /> {item.quantity > 0 ? "ยื่นเรื่องผ่อนรุ่นนี้" : "สินค้าหมด"}
        </button>
      </div>
    </div>
  );
}
