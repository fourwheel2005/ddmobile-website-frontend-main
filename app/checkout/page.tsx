"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getApiError } from "@/lib/errorMessage";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";
import Link from "next/link";
import { Banknote, Smartphone, ArrowRight, ShoppingCart, MessageCircle, TicketPercent } from "lucide-react";

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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");

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
  }, [router]);

  // ส่วนลด (แสดงผลเท่านั้น — server คิดใหม่ตอนสร้างออเดอร์)
  const selectedCoupon = coupons.find((c) => c.code === couponCode) || null;
  const discount = selectedCoupon ? Math.round((total * selectedCoupon.percent) / 100) : 0;
  const payable = Math.max(0, total - discount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("ตะกร้าว่างเปล่า"); return; }
    if (!name.trim() || !tel.trim()) { toast.error("กรอกชื่อและเบอร์โทรผู้รับ"); return; }
    if (!address.trim()) { toast.error("กรอกที่อยู่จัดส่ง"); return; }

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
      });
      clear();
      toast.success("สร้างคำสั่งซื้อสำเร็จ!");
      router.push(`/orders/${res.data.id}`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) { router.replace("/login?redirect=/checkout"); return; }
      toast.error(getApiError(err, "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
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
          <div className="space-y-6 lg:col-span-2">
            {/* ผู้รับ */}
            <div className="card-dd">
              <h2 className="mb-4 font-bold text-text-heading">ข้อมูลผู้รับ</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-dd">ชื่อ-นามสกุล *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required className="input-dd" placeholder="ชื่อผู้รับสินค้า" />
                </div>
                <div>
                  <label className="label-dd">เบอร์โทร *</label>
                  <input value={tel} onChange={(e) => setTel(e.target.value)} required inputMode="tel" className="input-dd" placeholder="08x-xxx-xxxx" />
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
                <label className="label-dd">ที่อยู่จัดส่ง *</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required className="input-dd resize-none" placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์" />
              </div>
              <div className="mt-4">
                <label className="label-dd">หมายเหตุ (ถ้ามี)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} className="input-dd" placeholder="เช่น สีที่ต้องการ / เวลาจัดส่ง" />
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
          </div>

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
                <div className="flex items-center justify-between border-t border-border-default pt-2">
                  <span className="font-bold text-text-heading">รวมทั้งสิ้น</span>
                  <span className="text-xl font-bold text-price">{money(payable)}</span>
                </div>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full py-3.5 text-base">
                {submitting ? "กำลังสร้างคำสั่งซื้อ..." : <>ยืนยันคำสั่งซื้อ <ArrowRight size={18} /></>}
              </button>
              <p className="mt-2 text-center text-xs text-text-muted">ระบบจะจองสินค้าให้ก่อน รอแอดมินยืนยัน</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
