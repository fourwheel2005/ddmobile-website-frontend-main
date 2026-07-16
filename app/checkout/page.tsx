"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";
import Link from "next/link";
import { Banknote, Smartphone, ArrowRight, ShoppingCart, MessageCircle, TicketPercent, ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import Reveal from "@/components/Reveal";

import { baht as money } from "@/lib/money";
import { LINE_URL } from "@/lib/contact";

interface Coupon { code: string; percent: number; expiresAt: string | null; }

/**
 * ชำระเงินซื้อขาด (โอน/PromptPay + แนบสลิป) เท่านั้น
 * การผ่อน + นัดรับที่ร้าน ยกเลิกจากเว็บแล้ว — ลูกค้าที่ต้องการผ่อนให้ทักไลน์ (ปุ่มในหน้าสินค้า)
 */
export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);   // กันกดซ้ำแบบ synchronous (ก่อน React re-render disable ปุ่มทัน)
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [promoCode, setPromoCode] = useState("");                       // โค้ดโปรโมชั่น (แยกจากคูปองวงล้อ)
  const [promoPreview, setPromoPreview] = useState<{ promos: { name: string; amount: number }[]; totalDiscount: number } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // พรีวิวโปรจาก server (แสดงผลเท่านั้น — ตอนสร้างออเดอร์คิดใหม่) · โปรอัตโนมัติขึ้นเองไม่ต้องกรอกโค้ด
  const previewPromo = async (code: string) => {
    if (items.length === 0) { setPromoPreview(null); return; }
    setCheckingPromo(true);
    try {
      const res = await api.post("/promotions/preview", {
        items: items.map((i) => ({ catalogId: i.catalogId, quantity: i.quantity })),
        promoCode: code.trim() || null,
      });
      setPromoPreview(res.data);
      if (code.trim()) {
        const hit = (res.data?.promos ?? []).length > 0 && res.data.totalDiscount > 0;
        if (hit) toast.success("ใช้โค้ดโปรโมชั่นแล้ว"); else toast.error("โค้ดใช้ไม่ได้ หรือไม่เข้าเงื่อนไข");
      }
    } catch { setPromoPreview(null); }
    finally { setCheckingPromo(false); }
  };

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { router.replace("/login?redirect=/checkout"); return; }
    try { const user = JSON.parse(u); if (user.name) setName(user.name); } catch { /* */ }
    // คูปองที่ใช้ได้ของลูกค้า → auto เลือกใบที่ลดมากสุด
    api.get("/coupons/mine").then((r) => {
      const list: Coupon[] = Array.isArray(r.data) ? r.data : [];
      setCoupons(list);
      if (list.length) setCouponCode(list.reduce((a, b) => (b.percent > a.percent ? b : a)).code);
    }).catch(() => { /* ไม่มีคูปอง/ผิดพลาด → เงียบ */ });
    previewPromo("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ส่วนลด (แสดงผลเท่านั้น — server คิดใหม่ตอนสร้างออเดอร์)
  const selectedCoupon = coupons.find((c) => c.code === couponCode) || null;
  const discount = selectedCoupon ? Math.round((total * selectedCoupon.percent) / 100) : 0;
  const promoTotal = promoPreview?.totalDiscount ?? 0;
  const payable = Math.max(0, total - discount - promoTotal);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current) return;   // กันดับเบิลคลิก/กด Enter รัว ๆ ยิง POST /orders ซ้ำ → ออเดอร์ซ้ำ
    if (items.length === 0) { toast.error("ตะกร้าว่างเปล่า"); return; }
    if (!name.trim() || !tel.trim()) { toast.error("กรอกชื่อและเบอร์โทรผู้รับ"); return; }
    // เบอร์ไทย: 9-10 หลัก (รับเว้นวรรค/ขีดได้) — กันกรอกมั่ว เช่น "abc"
    if (!/^0\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}$/.test(tel.trim())) { toast.error("กรุณากรอกเบอร์โทรให้ถูกต้อง (เช่น 081-234-5678)"); return; }
    if (!address.trim()) { toast.error("กรอกที่อยู่จัดส่ง"); return; }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const res = await api.post("/orders", {
        items: items.map((i) => ({ catalogId: i.catalogId, quantity: i.quantity })),
        paymentMethod: "TRANSFER",
        customerName: name.trim(),
        customerTel: tel.trim(),
        shippingAddress: address.trim(),
        note: note.trim() || null,
        installmentMonths: null,
        couponCode: couponCode || null,
        promoCode: promoCode.trim() || null,
      });
      clear();
      toast.success("สร้างคำสั่งซื้อสำเร็จ!");
      router.push(`/orders/${res.data.id}`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) { router.replace("/login?redirect=/checkout"); return; }
      toast.error(getApiError(err, "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      submitLock.current = false;   // ปลดล็อกให้ลองใหม่ได้ (สำเร็จแล้ว navigate ออกไปแล้ว)
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="page-wrapper min-h-screen bg-bg-base">
        <div className="container-dd py-20 text-center">
          <ShoppingCart size={56} className="mx-auto mb-4 text-text-disabled" />
          <h1 className="text-2xl font-bold text-text-heading">ไม่มีสินค้าให้ชำระเงิน</h1>
          <Link href="/products" className="btn-primary mt-6 inline-flex">เลือกซื้อสินค้า</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">
        <h1 className="mb-6 text-2xl font-bold text-text-heading md:text-3xl">ชำระเงิน</h1>

        <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ฟอร์ม */}
          <Reveal className="reveal-stagger space-y-6 lg:col-span-2">
            {/* ผู้รับ */}
            <div className="card-dd">
              <h2 className="mb-4 font-bold text-text-heading">ข้อมูลผู้รับ</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="co-name" className="label-dd">ชื่อ-นามสกุล *</label>
                  <input id="co-name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="input-dd" placeholder="ชื่อผู้รับสินค้า" />
                </div>
                <div>
                  <label htmlFor="co-tel" className="label-dd">เบอร์โทร *</label>
                  <input id="co-tel" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} required inputMode="tel" autoComplete="tel" className="input-dd" placeholder="08x-xxx-xxxx" />
                </div>
              </div>
            </div>

            {/* การชำระเงิน + จัดส่ง */}
            <div className="card-dd">
              <h2 className="mb-4 font-bold text-text-heading">วิธีชำระเงิน</h2>

              {/* ซื้อขาดอย่างเดียว — โอน/PromptPay */}
              <div className="flex items-start gap-3 rounded-xl border border-yellow bg-yellow/10 p-4">
                <Banknote size={22} className="mt-0.5 flex-shrink-0 text-yellow-hover" />
                <div>
                  <p className="font-semibold text-text-heading">โอน / PromptPay (ซื้อขาด)</p>
                  <p className="text-xs text-text-muted">โอนเต็มจำนวน แล้วแนบสลิปในหน้าถัดไป · แอดมินตรวจสอบและจัดส่งให้</p>
                </div>
              </div>

              {/* อยากผ่อน → ทักไลน์ */}
              <a href={LINE_URL} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-line/50 bg-line/5 px-4 py-3 text-sm text-text-body transition-colors hover:bg-line/10">
                <MessageCircle size={18} className="flex-shrink-0 text-line" />
                <span>อยาก<span className="font-semibold text-text-heading">ผ่อนเครื่องนี้</span>? ทักแอดมินทางไลน์เพื่อทำเรื่องผ่อน</span>
                <ArrowRight size={16} className="ml-auto flex-shrink-0 text-line" />
              </a>

              <div className="mt-4">
                <label htmlFor="co-address" className="label-dd">ที่อยู่จัดส่ง *</label>
                <textarea id="co-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required autoComplete="street-address" className="input-dd resize-none" placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์" />
              </div>
              <div className="mt-4">
                <label htmlFor="co-note" className="label-dd">หมายเหตุ (ถ้ามี)</label>
                <input id="co-note" value={note} onChange={(e) => setNote(e.target.value)} className="input-dd" placeholder="เช่น สีที่ต้องการ / เวลาจัดส่ง" />
              </div>

              {/* โค้ดโปรโมชั่น / Flash Sale */}
              <div className="mt-4 rounded-xl border border-border-default bg-bg-subtle p-4">
                <p className="mb-2 text-sm font-bold text-text-heading">โค้ดโปรโมชั่น</p>
                <div className="flex gap-2">
                  <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                         aria-label="โค้ดโปรโมชั่น" className="input-dd flex-1 font-mono" placeholder="เช่น SAVE50 (ถ้ามี)" />
                  <button type="button" onClick={() => previewPromo(promoCode)} disabled={checkingPromo}
                          className="btn-secondary flex-shrink-0">{checkingPromo ? "..." : "ใช้โค้ด"}</button>
                </div>
                {promoPreview && promoPreview.promos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {promoPreview.promos.map((p) => (
                      <p key={p.name} className="flex items-center gap-1 text-xs font-medium text-success-text"><BadgeCheck size={13} className="flex-shrink-0" /> {p.name} −{money(p.amount)}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* คูปองส่วนลด (จากวงล้อ ฯลฯ) */}
              {coupons.length > 0 && (
                <div className="mt-4 rounded-xl border border-yellow/40 bg-yellow/5 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text-heading">
                    <TicketPercent size={16} className="text-yellow-hover" /> โค้ดส่วนลดของคุณ
                  </p>
                  <div className="space-y-2">
                    {coupons.map((c) => (
                      <label key={c.code} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${couponCode === c.code ? "border-yellow bg-yellow/10" : "border-border-default hover:border-yellow"}`}>
                        <input type="radio" name="coupon" checked={couponCode === c.code} onChange={() => setCouponCode(c.code)} className="accent-yellow-hover" />
                        <span className="flex flex-1 flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-text-heading">{c.code}</span>
                          <span className="rounded-full bg-yellow px-2 py-0.5 text-xs font-bold text-[#1a1a1a]">ลด {c.percent}%</span>
                          {c.expiresAt && <span className="text-[11px] text-text-muted">ถึง {new Date(c.expiresAt).toLocaleDateString("th-TH")}</span>}
                        </span>
                      </label>
                    ))}
                    <button type="button" onClick={() => setCouponCode("")}
                      className={`w-full rounded-xl border p-2 text-sm transition-colors ${couponCode === "" ? "border-yellow bg-yellow/10 text-text-heading" : "border-border-default text-text-muted hover:border-yellow"}`}>
                      ไม่ใช้โค้ด
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Reveal>

          {/* สรุป */}
          <div className="lg:col-span-1">
            <div className="card-dd sticky top-20">
              <h2 className="mb-4 font-bold text-text-heading">รายการสินค้า</h2>
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {items.map((it) => (
                  <div key={it.catalogId} className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle">
                      {it.imageUrl ? <img src={it.imageUrl} alt={it.productName} className="h-full w-full object-contain p-1" /> : <Smartphone size={18} className="text-text-disabled" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-heading">{it.productName}</p>
                      <p className="text-xs text-text-muted">{it.conditionLabel} · x{it.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-text-heading">{money(it.unitPrice * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-border-default pt-3 text-sm">
                <div className="flex justify-between"><span className="text-text-muted">ราคาสินค้า</span><span className="font-medium text-text-heading">{money(total)}</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-success-text"><span>ส่วนลดคูปอง ({selectedCoupon?.percent}%)</span><span className="font-semibold">−{money(discount)}</span></div>
                )}
                {promoTotal > 0 && promoPreview?.promos.map((p) => (
                  <div key={p.name} className="flex justify-between text-success-text"><span>โปรโมชั่น: {p.name}</span><span className="font-semibold">−{money(p.amount)}</span></div>
                ))}
                <div className="flex items-center justify-between border-t border-border-default pt-2">
                  <span className="font-bold text-text-heading">รวมทั้งสิ้น</span>
                  <span className="text-xl font-bold text-price">{money(payable)}</span>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full py-3.5 text-base">
                {submitting ? "กำลังสร้างคำสั่งซื้อ..." : <>ยืนยันคำสั่งซื้อ <ArrowRight size={18} /></>}
              </button>
              <p className="mt-2 text-center text-xs text-text-muted">จองสินค้าให้ทันที · ระบบตรวจสลิปอัตโนมัติ · ยอดตรงแอดมินอนุมัติทันที</p>
              {/* trust block — ความมั่นใจก่อนกดจ่าย */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-default pt-4">
                {[
                  { icon: ShieldCheck, t: "ตรวจสลิปอัตโนมัติ" },
                  { icon: Lock, t: "ข้อมูลปลอดภัย" },
                  { icon: BadgeCheck, t: "เครื่องแท้ 100%" },
                ].map(({ icon: I, t }) => (
                  <div key={t} className="flex flex-col items-center gap-1 text-center">
                    <I size={18} className="text-success-text" />
                    <span className="text-[11px] font-medium text-text-muted">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
