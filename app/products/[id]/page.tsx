"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  Smartphone, Loader2, ShieldCheck, CheckCircle2, XCircle,
  MessageCircle, ArrowLeft, ChevronRight, Sparkles, RotateCcw, BatteryMedium, Hash, ShoppingCart, Zap
} from "lucide-react";
import toast from "react-hot-toast";
import CountUp from "@/components/CountUp";
import { useCart } from "@/context/CartContext";

interface CatalogItem {
  id: string;
  type: "UNIT" | "GROUP";
  variantId: string;
  productName: string;
  brand: string;
  category: string;
  sku: string;
  color: string | null;
  storage: string | null;
  condition: string;
  conditionLabel: string;
  quantity: number;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl: string | null;
  gallery: string[] | null;
  avgBatteryHealth: number | null;
  imei: string | null;
  warrantyExpire: string | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { add } = useCart();
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

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
  const isUnit = item.type === "UNIT";
  const canBuy = item.minPrice != null && item.quantity > 0;
  // รวมรูปหลัก (Stock) + รูปเสริม (DD) เป็นแกลเลอรี
  const images = [item.imageUrl, ...(item.gallery ?? [])].filter((x): x is string => !!x);
  const mainImg = images[activeImg] ?? images[0] ?? null;

  const toCartItem = () => ({
    catalogId: item.id, type: item.type, productName: item.productName, variantId: item.variantId,
    condition: item.condition, conditionLabel: item.conditionLabel, sku: item.sku,
    color: item.color, storage: item.storage, imageUrl: item.imageUrl,
    unitPrice: item.minPrice ?? 0, maxStock: item.type === "UNIT" ? 1 : item.quantity,
  });
  const addToCart = () => {
    const r = add(toCartItem());
    if (r.ok) toast.success("เพิ่มลงตะกร้าแล้ว");
    else toast(r.reason || "เพิ่มไม่ได้", { icon: "🛒" });
  };
  const buyNow = () => {
    const r = add(toCartItem());
    if (r.ok || r.reason === "เครื่องนี้อยู่ในตะกร้าแล้ว") router.push("/checkout");
    else toast(r.reason || "เพิ่มไม่ได้", { icon: "🛒" });
  };
  const installment = item.minPrice ? Math.ceil(item.minPrice / 10) : 0;
  const priceText = item.minPrice == null ? "สอบถามราคา" : "฿" + item.minPrice.toLocaleString();
  const warranty = item.warrantyExpire
    ? `ประกันถึง ${new Date(item.warrantyExpire).toLocaleDateString("th-TH")}`
    : isNew ? "ประกันศูนย์ 1 ปี" : "ตรวจเช็คคุณภาพแล้ว";

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
          {/* image + แกลเลอรี */}
          <div>
            <div className="relative flex aspect-square items-center justify-center rounded-2xl border border-border-default bg-white p-8">
              <span className={`badge-dd absolute left-5 top-5 z-10 ${isNew ? "badge-success" : "badge-info"}`}>
                {isNew ? <Sparkles size={12} /> : <RotateCcw size={12} />} {item.conditionLabel}
              </span>
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImg} alt={item.productName} width={420} height={420} className="h-full w-full max-w-sm object-contain" />
              ) : (
                <Smartphone size={120} className="text-text-disabled" />
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`h-16 w-16 overflow-hidden rounded-lg border bg-white p-1 transition ${i === activeImg ? "border-yellow ring-2 ring-yellow" : "border-border-default hover:border-text-muted"}`}
                    aria-label={`ดูรูปที่ ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${item.productName} รูปที่ ${i + 1}`} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* info */}
          <div className="flex flex-col">
            <p className="text-sm font-medium text-text-muted">{item.brand} · {item.category}</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight text-text-heading md:text-3xl">{item.productName}</h1>

            <div className="my-5 flex flex-wrap gap-2">
              {item.quantity > 0 ? (
                <span className="badge-dd badge-success">
                  <CheckCircle2 size={14} /> {isUnit ? "พร้อมส่ง (เครื่องนี้)" : `พร้อมส่ง (เหลือ ${item.quantity} ชิ้น)`}
                </span>
              ) : (
                <span className="badge-dd badge-error"><XCircle size={14} /> สินค้าหมดชั่วคราว</span>
              )}
              {item.avgBatteryHealth != null && (
                <span className="badge-dd badge-warning"><BatteryMedium size={14} /> แบตเตอรี่ {item.avgBatteryHealth}%</span>
              )}
            </div>

            <div className="rounded-2xl border border-border-default bg-bg-subtle p-5">
              <p className="text-sm text-text-muted">ราคา{isNew ? "เครื่องใหม่" : "เครื่องมือสอง"}</p>
              <div className="flex items-baseline gap-2">
                {item.minPrice == null ? (
                  <span className="text-2xl font-bold text-price md:text-3xl">สอบถามราคา</span>
                ) : (
                  <>
                    <CountUp value={item.minPrice} prefix="฿" className="text-3xl font-bold text-price md:text-4xl" />
                    {item.type === "GROUP" && item.maxPrice != null && item.maxPrice !== item.minPrice && (
                      <span className="text-lg text-text-muted">- ฿{Number(item.maxPrice).toLocaleString()}</span>
                    )}
                  </>
                )}
              </div>
              {item.minPrice != null && (
                <div className="mt-4 flex items-center gap-3 border-t border-border-default pt-4 text-sm">
                  <span className="text-text-muted">ผ่อนเริ่มต้นเพียง</span>
                  <span className="text-lg font-bold text-text-heading"><CountUp value={installment} prefix="฿" /> / เดือน</span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="font-bold text-text-heading">รายละเอียด</h3>
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">สภาพเครื่อง</span><span className="col-span-2 font-medium text-text-heading">{item.conditionLabel}</span></div>
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">หมวดหมู่</span><span className="col-span-2 font-medium text-text-heading">{item.category}</span></div>
              {item.color && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">สี</span><span className="col-span-2 font-medium text-text-heading">{item.color}</span></div>}
              {item.storage && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">ความจุ</span><span className="col-span-2 font-medium text-text-heading">{item.storage}</span></div>}
              {isUnit && item.imei && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">IMEI</span><span className="col-span-2 flex items-center gap-1.5 font-mono text-xs text-text-body"><Hash size={13} /> {item.imei}</span></div>}
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">SKU</span><span className="col-span-2 font-mono text-xs text-text-body">{item.sku}</span></div>
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">การรับประกัน</span><span className="col-span-2 flex items-center gap-2 font-medium text-success-text"><ShieldCheck size={16} /> {warranty}</span></div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button disabled={!canBuy} onClick={addToCart} className="btn-secondary flex-1 py-3.5 text-base disabled:opacity-40">
                  <ShoppingCart size={20} /> เพิ่มลงตะกร้า
                </button>
                <button disabled={!canBuy} onClick={buyNow} className="btn-primary flex-1 py-3.5 text-base disabled:opacity-40">
                  <Zap size={20} /> {item.quantity > 0 ? (item.minPrice == null ? "สอบถามราคา" : "ซื้อเลย") : "สินค้าหมด"}
                </button>
              </div>
              <a href="https://lin.ee/Zsq9ja0" target="_blank" rel="noopener noreferrer" className="btn-ghost w-full py-3 text-base">
                <MessageCircle size={20} /> สอบถามแอดมิน / ผ่อนสินค้า
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA (มือถือ) */}
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-[80] flex items-center gap-3 border-t border-border-default bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex-shrink-0">
          <p className="text-[11px] text-text-muted">ราคา</p>
          <p className="text-lg font-bold leading-none text-price">{priceText}</p>
        </div>
        <button disabled={!canBuy} onClick={addToCart} aria-label="เพิ่มลงตะกร้า" className="btn-secondary px-4 py-3 disabled:opacity-40">
          <ShoppingCart size={18} />
        </button>
        <button disabled={!canBuy} onClick={buyNow} className="btn-primary flex-1 py-3 disabled:opacity-40">
          <Zap size={18} /> {item.quantity > 0 ? (item.minPrice == null ? "สอบถามราคา" : "ซื้อเลย") : "สินค้าหมด"}
        </button>
      </div>
    </div>
  );
}
