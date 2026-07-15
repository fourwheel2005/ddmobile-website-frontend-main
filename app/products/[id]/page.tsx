"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { baht } from "@/lib/money";
import { promoForItem, type PublicPromotion } from "@/lib/promo";
import { LINE_URL } from "@/lib/contact";
import {
  Smartphone, ShieldCheck, CheckCircle2, XCircle,
  MessageCircle, ArrowLeft, ChevronRight, Sparkles, RotateCcw, BatteryMedium, Hash, ShoppingCart, Zap
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import CountUp from "@/components/CountUp";
import { useCart } from "@/context/CartContext";
import InstallmentBox, { InstallmentInfo } from "@/components/InstallmentBox";

interface VariantOption {
  variantId: string;
  color: string | null;
  storage: string | null;
  price: number | null;
  quantity: number;
  imageUrl: string | null;
  gallery: string[] | null;
}

interface CatalogItem {
  id: string;
  type: "MODEL" | "UNIT" | "GROUP";
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
  grade: string | null;
  options: VariantOption[] | null;
  sold?: boolean;
  soldAt?: string | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { add } = useCart();
  const reduceMotion = useReducedMotion();
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [selColor, setSelColor] = useState<string | null>(null);
  const [selStorage, setSelStorage] = useState<string | null>(null);
  const [installment, setInstallment] = useState<InstallmentInfo | null>(null);
  const [promos, setPromos] = useState<PublicPromotion[]>([]);

  useEffect(() => {
    api.get("/promotions/active").then((r) => setPromos(Array.isArray(r.data) ? r.data : [])).catch(() => { /* ไม่มีโปร */ });
  }, []);

  // มือ 1 (MODEL): ตั้งค่าตัวเลือกเริ่มต้น = option แรก
  useEffect(() => {
    if (item?.type === "MODEL" && item.options && item.options.length > 0) {
      setSelColor(item.options[0].color);
      setSelStorage(item.options[0].storage);
      setActiveImg(0);
    }
  }, [item]);

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

  // ดึงตารางผ่อน (overlay DD): MODEL → ตาม productId+ความจุ · UNIT(มือ2) → ราย เครื่อง
  useEffect(() => {
    if (!item) return;
    let cancel = false;
    const load = async () => {
      try {
        let res;
        if (item.type === "UNIT") {
          res = await api.get(`/installment/serial/${encodeURIComponent(item.id)}`);
        } else if (item.type === "MODEL") {
          res = await api.get(`/installment/model`, { params: { productId: item.id, storage: selStorage ?? "" } });
        } else {
          if (!cancel) setInstallment(null);
          return;
        }
        const info = res.status === 204 ? null : (res.data as InstallmentInfo);
        if (!cancel) setInstallment(info && (info.downPayment != null || (info.terms?.length ?? 0) > 0) ? info : null);
      } catch {
        if (!cancel) setInstallment(null);
      }
    };
    load();
    return () => { cancel = true; };
  }, [item, selStorage]);

  if (isLoading) {
    return (
      <div className="page-wrapper min-h-screen bg-bg-base">
        <div className="container-dd py-8 md:py-12">
          <div className="skeleton mb-6 h-4 w-64 rounded" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="skeleton aspect-square w-full rounded-2xl" />
            <div className="space-y-4">
              <div className="skeleton h-3 w-32 rounded" />
              <div className="skeleton h-8 w-3/4 rounded" />
              <div className="flex gap-2"><div className="skeleton h-6 w-20 rounded-full" /><div className="skeleton h-6 w-24 rounded-full" /></div>
              <div className="skeleton h-24 w-full rounded-2xl" />
              <div className="skeleton h-10 w-1/2 rounded" />
              <div className="space-y-2 pt-4"><div className="skeleton h-3 w-full rounded" /><div className="skeleton h-3 w-5/6 rounded" /><div className="skeleton h-3 w-2/3 rounded" /></div>
              <div className="flex gap-3 pt-4"><div className="skeleton h-12 flex-1 rounded-full" /><div className="skeleton h-12 flex-1 rounded-full" /></div>
            </div>
          </div>
        </div>
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
  const isModel = item.type === "MODEL";
  const options = item.options ?? [];

  // มือ 1 (MODEL): ตัวเลือกสี/ความจุ
  const colors = Array.from(new Set(options.map((o) => o.color).filter((c): c is string => !!c)));
  const storagesForColor = (c: string | null) =>
    Array.from(new Set(options.filter((o) => o.color === c).map((o) => o.storage).filter((s): s is string => !!s)));
  const selOption = isModel
    ? (options.find((o) => o.color === selColor && o.storage === selStorage)
        ?? options.find((o) => o.color === selColor)
        ?? options[0] ?? null)
    : null;

  // ค่าที่ใช้แสดง/ซื้อ (MODEL ใช้ option ที่เลือก, อื่น ๆ ใช้ item)
  const effPrice = isModel ? (selOption?.price ?? null) : item.minPrice;
  const effQty = isModel ? (selOption?.quantity ?? 0) : item.quantity;
  const effVariantId = isModel ? (selOption?.variantId ?? item.variantId) : item.variantId;
  const effColor = isModel ? (selOption?.color ?? null) : item.color;
  const effStorage = isModel ? (selOption?.storage ?? null) : item.storage;
  // gallery รวมรูปปก (index 0) อยู่แล้ว → ใช้ gallery ตรง ๆ + dedupe กันรูปซ้ำ (cover ซ้ำ / URL ซ้ำจาก Stock)
  const rawImages = isModel
    ? (selOption?.gallery && selOption.gallery.length > 0 ? selOption.gallery : (selOption?.imageUrl ? [selOption.imageUrl] : []))
    : (item.gallery && item.gallery.length > 0 ? item.gallery : (item.imageUrl ? [item.imageUrl] : []));
  const images = Array.from(new Set(rawImages.filter((x): x is string => !!x)));
  const mainImg = images[activeImg] ?? images[0] ?? null;
  const canBuy = effPrice != null && effQty > 0;

  const pickColor = (c: string) => {
    setSelColor(c);
    const sts = storagesForColor(c);
    setSelStorage(sts.length > 0 ? sts[0] : null);
    setActiveImg(0);
  };
  const pickStorage = (s: string) => { setSelStorage(s); setActiveImg(0); };

  const toCartItem = () => ({
    catalogId: isModel ? effVariantId : item.id,
    type: (isModel ? "GROUP" : item.type) as "UNIT" | "GROUP",
    productName: item.productName, variantId: effVariantId,
    condition: item.condition, conditionLabel: item.conditionLabel, sku: item.sku,
    color: effColor, storage: effStorage,
    imageUrl: isModel ? (selOption?.imageUrl ?? item.imageUrl) : item.imageUrl,
    unitPrice: effPrice ?? 0, maxStock: isModel ? effQty : (item.type === "UNIT" ? 1 : item.quantity),
  });
  const addToCart = () => {
    const r = add(toCartItem());
    if (r.ok) toast.success("เพิ่มลงตะกร้าแล้ว");
    else toast(r.reason || "เพิ่มไม่ได้", { icon: <ShoppingCart size={18} className="text-yellow-hover" /> });
  };
  const buyNow = () => {
    const r = add(toCartItem());
    if (r.ok || r.reason === "เครื่องนี้อยู่ในตะกร้าแล้ว") router.push("/checkout");
    else toast(r.reason || "เพิ่มไม่ได้", { icon: <ShoppingCart size={18} className="text-yellow-hover" /> });
  };
  const priceText = baht(effPrice, "สอบถามราคา");
  // โปร flash sale ของตัวที่เลือกอยู่ (แสดงผลเท่านั้น — server คิดจริงตอนสร้างออเดอร์)
  const flash = item.sold ? null : promoForItem(promos, { id: item.id, variantId: effVariantId, category: item.category }, effPrice);
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
              {/* เครื่องขายแล้ว — ป้ายทับกลางรูป */}
              {item.sold && (
                <span className="absolute inset-0 z-20 flex items-center justify-center">
                  <span className="-rotate-12 rounded-xl border-2 border-white/90 bg-text-heading/85 px-6 py-2 text-2xl font-extrabold tracking-wide text-white shadow-xl">
                    ขายแล้ว
                  </span>
                </span>
              )}
              <AnimatePresence mode="wait" initial={false}>
                {mainImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <motion.div
                    key={mainImg}
                    className="relative h-full w-full max-w-sm"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
                  >
                    <Image src={mainImg} alt={item.productName} fill priority sizes="(max-width: 1024px) 90vw, 45vw"
                           className={`object-contain ${item.sold ? "opacity-40 grayscale" : ""}`} />
                  </motion.div>
                ) : (
                  <Smartphone size={120} className="text-text-disabled" />
                )}
              </AnimatePresence>
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
              {effQty > 0 ? (
                <span className="badge-dd badge-success">
                  <CheckCircle2 size={14} /> {isUnit ? "พร้อมส่ง (เครื่องนี้)" : `พร้อมส่ง (เหลือ ${effQty} ชิ้น)`}
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
                {effPrice == null ? (
                  <span className="text-2xl font-bold text-price md:text-3xl">สอบถามราคา</span>
                ) : flash ? (
                  <>
                    <span className="mr-1 text-lg font-medium text-text-muted line-through">฿{effPrice.toLocaleString()}</span>
                    <CountUp value={flash.priceAfter} prefix="฿" className="text-3xl font-bold text-price md:text-4xl" />
                  </>
                ) : (
                  <>
                    <CountUp value={effPrice} prefix="฿" className="text-3xl font-bold text-price md:text-4xl" />
                    {item.type === "GROUP" && item.maxPrice != null && item.maxPrice !== item.minPrice && (
                      <span className="text-lg text-text-muted">- ฿{Number(item.maxPrice).toLocaleString()}</span>
                    )}
                  </>
                )}
                {flash && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-price/5 px-3 py-2 ring-1 ring-price/20">
                    <span className="inline-flex items-center gap-1 rounded-full bg-price px-2.5 py-0.5 text-xs font-bold text-white"><Zap size={11} className="fill-white" /> {flash.label}</span>
                    <span className="text-sm font-semibold text-text-heading">{flash.name}</span>
                    <FlashCountdown endAt={flash.endAt} />
                    <span className="w-full text-[11px] text-text-muted">ส่วนลดคำนวณให้อัตโนมัติตอนชำระเงิน</span>
                  </div>
                )}
              </div>
            </div>

            {/* มือ 1 (MODEL): เลือกสี / ความจุ แบบ Shopee */}
            {isModel && (
              <div className="mt-5 space-y-4">
                {colors.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-text-heading">สี</p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => {
                        const opt = options.find((o) => o.color === c);
                        const active = c === selColor;
                        // สีที่หมดสต๊อก (ทุกความจุ qty 0) → โชว์จาง + ป้าย "หมด" แบบ Shopee (ยังกดดูได้)
                        const soldOut = !options.some((o) => o.color === c && o.quantity > 0);
                        return (
                          <button
                            key={c}
                            onClick={() => pickColor(c)}
                            title={soldOut ? `${c} — สินค้าหมด (รอเติมสต๊อก)` : c}
                            className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${active ? "border-yellow ring-2 ring-yellow text-text-heading" : "border-border-default text-text-body hover:border-text-muted"} ${soldOut ? "opacity-40" : ""}`}
                          >
                            {opt?.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={opt.imageUrl} alt={c} className={`h-7 w-7 rounded object-cover ${soldOut ? "grayscale" : ""}`} />
                            )}
                            {c}
                            {soldOut && <span className="ml-1 rounded bg-text-heading/10 px-1 text-[11px] font-medium text-text-muted">หมด</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {storagesForColor(selColor).length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-text-heading">ความจุ</p>
                    <div className="flex flex-wrap gap-2">
                      {storagesForColor(selColor).map((s) => {
                        const opt = options.find((o) => o.color === selColor && o.storage === s);
                        const out = !opt || opt.quantity <= 0;
                        const active = s === selStorage;
                        return (
                          <button
                            key={s}
                            onClick={() => pickStorage(s)}
                            disabled={out}
                            className={`rounded-xl border px-4 py-2 text-sm transition ${active ? "border-yellow ring-2 ring-yellow text-text-heading" : "border-border-default text-text-body hover:border-text-muted"} ${out ? "opacity-40" : ""}`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* กล่องผ่อน + ดึงเข้า LINE (แสดงเมื่อแอดมินตั้งตารางผ่อนไว้) */}
            {installment && (
              <InstallmentBox
                info={installment}
                product={{
                  productName: item.productName,
                  sku: item.sku,
                  serialOrImei: isUnit ? item.imei : null,
                  color: effColor,
                  storage: effStorage,
                  conditionLabel: item.conditionLabel,
                  price: effPrice,
                }}
              />
            )}

            <div className="mt-6 space-y-3">
              <h3 className="font-bold text-text-heading">{isUnit ? "สภาพเครื่องมือสอง (ตรวจสอบแล้ว)" : "รายละเอียด"}</h3>

              {/* แบตเตอรี่ มือสอง — แสดงเป็นแถบชัดเจน */}
              {isUnit && item.avgBatteryHealth != null && (
                <div className="rounded-xl border border-border-default bg-bg-subtle p-3.5">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-text-heading"><BatteryMedium size={16} className="text-success-text" /> สุขภาพแบตเตอรี่</span>
                    <span className="font-bold text-text-heading">{item.avgBatteryHealth}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-border-default">
                    <div className={`h-full rounded-full transition-all ${item.avgBatteryHealth >= 85 ? "bg-success-text" : item.avgBatteryHealth >= 75 ? "bg-yellow" : "bg-error-text"}`} style={{ width: `${Math.min(100, item.avgBatteryHealth)}%` }} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">สภาพเครื่อง</span><span className="col-span-2 font-medium text-text-heading">{item.conditionLabel}</span></div>
              {isUnit && item.grade && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">เกรดสภาพ</span><span className="col-span-2"><span className="badge-dd badge-info">เกรด {item.grade}</span></span></div>}
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">หมวดหมู่</span><span className="col-span-2 font-medium text-text-heading">{item.category}</span></div>
              {effColor && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">สี</span><span className="col-span-2 font-medium text-text-heading">{effColor}</span></div>}
              {effStorage && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">ความจุ</span><span className="col-span-2 font-medium text-text-heading">{effStorage}</span></div>}
              {isUnit && item.imei && <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">IMEI</span><span className="col-span-2 flex items-center gap-1.5 font-mono text-xs text-text-body"><Hash size={13} /> {item.imei}</span></div>}
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">SKU</span><span className="col-span-2 font-mono text-xs text-text-body">{item.sku}</span></div>
              <div className="grid grid-cols-3 gap-2 text-sm"><span className="text-text-muted">การรับประกัน</span><span className="col-span-2 flex items-center gap-2 font-medium text-success-text"><ShieldCheck size={16} /> {warranty}</span></div>

              {/* การันตีคุณภาพเครื่องมือสอง */}
              {isUnit && (
                <div className="mt-1 grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
                  {[
                    "ผ่านการตรวจสอบคุณภาพ",
                    "สภาพดี ใช้งานปกติ",
                    item.avgBatteryHealth != null ? `แบตเตอรี่ ${item.avgBatteryHealth}%` : "แบตเตอรี่พร้อมใช้",
                    "จัดส่งด่วนทั่วไทย",
                    "รับประกันหลังการขาย",
                    "เครื่องแท้ 100%",
                  ].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-success-bg px-2.5 py-1.5 text-[11px] font-medium text-success-text">
                      <CheckCircle2 size={13} className="flex-shrink-0" /> {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button disabled={!canBuy} onClick={addToCart} className="btn-secondary flex-1 py-3.5 text-base disabled:opacity-40">
                  <ShoppingCart size={20} /> เพิ่มลงตะกร้า
                </button>
                <button disabled={!canBuy} onClick={buyNow} className="btn-primary flex-1 py-3.5 text-base disabled:opacity-40">
                  <Zap size={20} /> {item.sold ? "ขายแล้ว" : item.quantity > 0 ? (item.minPrice == null ? "สอบถามราคา" : "ซื้อเลย") : "สินค้าหมด"}
                </button>
              </div>
              {/* ผ่อน → ทักไลน์โดยตรง (เมื่อมีกล่องผ่อน InstallmentBox มีปุ่มผ่อนของตัวเองแล้ว) · ไม่โชว์กับเครื่องขายแล้ว */}
              {!item.sold && !installment && (
                <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
                  className="line-cta group flex w-full items-center gap-3 rounded-full bg-line px-5 py-3.5 text-white shadow-[var(--shadow-line)] transition-transform hover:-translate-y-0.5">
                  <MessageCircle size={24} className="flex-shrink-0" />
                  <span className="flex flex-col text-left leading-tight">
                    <span className="text-base font-bold">ผ่อนเครื่องนี้ · ทักไลน์รับสิทธิ์เลย</span>
                    <span className="text-[11px] font-medium text-white/85">อนุมัติไวใน 1 วัน · ใช้บัตรประชาชนใบเดียว ไม่ต้องใช้บัตรเครดิต</span>
                  </span>
                  <ChevronRight size={20} className="ml-auto flex-shrink-0 transition-transform group-hover:translate-x-1" />
                </a>
              )}
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
          <Zap size={18} /> {item.sold ? "ขายแล้ว" : item.quantity > 0 ? (item.minPrice == null ? "สอบถามราคา" : "ซื้อเลย") : "สินค้าหมด"}
        </button>
      </div>
    </div>
  );
}

/** นับถอยหลังโปร (โชว์เมื่อเหลือ < 72 ชม. — ไกลกว่านั้นโชว์วันสิ้นสุด) */
function FlashCountdown({ endAt }: { endAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endAt]);
  if (!endAt) return null;
  const end = new Date(endAt).getTime();
  if (isNaN(end)) return null;
  const left = end - now;
  if (left <= 0) return null;
  if (left > 72 * 3600_000) {
    return <span className="text-xs font-medium text-price">ถึง {new Date(endAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>;
  }
  const h = Math.floor(left / 3600_000), m = Math.floor((left % 3600_000) / 60_000), sec = Math.floor((left % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-price">
      เหลือ {pad(h)}:{pad(m)}:{pad(sec)}
    </span>
  );
}
