"use client";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, Trash2, Minus, Plus, Smartphone, ArrowRight, Sparkles, RotateCcw, MessageCircle } from "lucide-react";

import { baht as money } from "@/lib/money";
import api from "@/lib/api";
import { lineChatUrl } from "@/lib/contact";
import { readStoredUser } from "@/lib/profile";
import { WEB_CHECKOUT, bestCoupon, buildCartMessage, type Buyer, type Coupon } from "@/lib/commerce";

export default function CartPage() {
  const { items, total, count, remove, setQty, clear } = useCart();
  const router = useRouter();
  // ปิดการสั่งบนเว็บ: ส่งรายการในตะกร้าเข้า LINE พร้อมคูปองที่ดีที่สุด + ชื่อ/เบอร์ (แอดมินปิดการขายในแชท)
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  useEffect(() => {
    if (WEB_CHECKOUT) return;
    let alive = true;
    const f = requestAnimationFrame(() => { const u = readStoredUser(); if (alive && u) setBuyer({ name: u.name, tel: u.tel }); });
    api.get<Coupon[]>("/coupons/mine").then((r) => { if (alive) setCoupon(bestCoupon(Array.isArray(r.data) ? r.data : [])); }).catch(() => {});
    return () => { alive = false; cancelAnimationFrame(f); };
  }, []);
  const cartMessage = buildCartMessage(items, buyer, coupon);

  const goCheckout = () => {
    const user = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!user) { router.push("/login?redirect=/checkout"); return; }
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <div className="page-wrapper min-h-screen bg-bg-base">
        <div className="container-dd py-20 text-center">
          <ShoppingCart size={56} className="mx-auto mb-4 text-text-disabled" />
          <h1 className="text-2xl font-bold text-text-heading">{WEB_CHECKOUT ? "ตะกร้าว่างเปล่า" : "สั่งซื้อผ่าน LINE ได้เลย"}</h1>
          <p className="mt-2 text-sm text-text-muted">
            {WEB_CHECKOUT ? "ยังไม่มีสินค้าในตะกร้า ลองเลือกชมสินค้าก่อนนะครับ" : "เลือกเครื่องที่ชอบ แล้วกด \"ซื้อเครื่องนี้ · ทักแอดมินทาง LINE\" ในหน้าสินค้า"}
          </p>
          <Link href="/products" className="btn-primary mt-6 inline-flex">เลือกซื้อสินค้า <ArrowRight size={18} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-2xl font-bold text-text-heading md:text-3xl">{WEB_CHECKOUT ? "ตะกร้าสินค้า" : "รายการที่สนใจ"} <span className="text-base font-normal text-text-muted">({count} ชิ้น)</span></h1>
          <button onClick={clear} className="text-sm text-text-muted hover:text-error-text">ล้างตะกร้า</button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* รายการ */}
          <Reveal className="reveal-stagger space-y-3 lg:col-span-2">
            {items.map((it) => (
              <div key={it.catalogId} className="card-dd flex gap-4 !p-3">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle">
                  {it.imageUrl ? <Image src={it.imageUrl} alt={it.productName} width={80} height={80} sizes="80px" className="h-full w-full object-contain p-1" /> : <Smartphone size={28} className="text-text-disabled" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-text-heading">{it.productName}</h3>
                      <p className="mt-0.5 text-xs text-text-muted">
                        <span className={`mr-1 inline-flex items-center gap-0.5 ${it.condition === "NEW" ? "text-success-text" : "text-info-text"}`}>
                          {it.condition === "NEW" ? <Sparkles size={10} /> : <RotateCcw size={10} />}{it.conditionLabel}
                        </span>
                        {[it.color, it.storage].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button onClick={() => remove(it.catalogId)} aria-label="ลบสินค้า" className="flex-shrink-0 rounded-full p-1.5 text-text-muted hover:bg-error-bg hover:text-error-text">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {it.type === "GROUP" ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(it.catalogId, it.quantity - 1)} aria-label="ลดจำนวน" className="flex h-9 w-9 items-center justify-center rounded-full border border-border-default text-text-body transition-colors hover:border-yellow hover:bg-bg-tinted disabled:opacity-30" disabled={it.quantity <= 1}><Minus size={14} /></button>
                        <span className="w-9 text-center text-sm font-semibold tabular-nums">{it.quantity}</span>
                        <button onClick={() => setQty(it.catalogId, it.quantity + 1)} aria-label="เพิ่มจำนวน" className="flex h-9 w-9 items-center justify-center rounded-full border border-border-default text-text-body transition-colors hover:border-yellow hover:bg-bg-tinted disabled:opacity-30" disabled={it.quantity >= it.maxStock}><Plus size={14} /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted">1 เครื่อง</span>
                    )}
                    <p className="font-bold text-price">{money(it.unitPrice * it.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}
          </Reveal>

          {/* สรุป */}
          <div className="lg:col-span-1">
            <div className="card-dd sticky top-20">
              <h2 className="mb-4 font-bold text-text-heading">สรุปคำสั่งซื้อ</h2>
              <div className="flex justify-between border-b border-border-subtle pb-3 text-sm">
                <span className="text-text-muted">ยอดรวมสินค้า</span>
                <span className="font-semibold text-text-heading">{money(total)}</span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-text-muted">ค่าจัดส่ง</span>
                <span className="text-text-muted">นัดกับแอดมิน</span>
              </div>
              <div className="flex items-center justify-between border-t border-border-default pt-3">
                <span className="font-bold text-text-heading">รวมทั้งสิ้น</span>
                <span className="text-xl font-bold text-price">{money(total)}</span>
              </div>
              {WEB_CHECKOUT ? (
                <button onClick={goCheckout} className="btn-primary mt-5 w-full py-3.5 text-base">
                  ดำเนินการชำระเงิน <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <a href={lineChatUrl(cartMessage)} target="_blank" rel="noopener noreferrer"
                    onClick={() => navigator.clipboard?.writeText(cartMessage).catch(() => {})}
                    className="line-cta mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-line py-3.5 text-base font-bold text-white shadow-[var(--shadow-line)]">
                    <MessageCircle size={20} /> ส่งรายการนี้ให้แอดมินทาง LINE
                  </a>
                  <p className="mt-2 text-center text-xs text-text-muted">ตอนนี้ร้านรับคำสั่งซื้อผ่าน LINE — แอดมินยืนยันราคา/สต็อกและนัดรับ/จัดส่งให้</p>
                </>
              )}
              <Link href="/products" className="mt-3 block text-center text-sm text-text-muted hover:text-text-heading">เลือกซื้อสินค้าเพิ่ม</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
