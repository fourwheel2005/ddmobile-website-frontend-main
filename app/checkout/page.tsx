"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";
import Link from "next/link";
import { Banknote, Store, Smartphone, ArrowRight, ShoppingCart, CreditCard } from "lucide-react";

const money = (v: number) => "฿" + Number(v).toLocaleString();
type Payment = "TRANSFER" | "PICKUP" | "INSTALLMENT";

interface InstallmentOptions { months: number[]; downPercent: number; interestPercent: number; }

// คิด preview ฝั่ง client (สูตรเดียวกับ server — ค่าจริง server คิดใหม่ตอนสร้างออเดอร์)
const planPreview = (total: number, months: number, downPct: number, intPct: number) => {
  const down = Math.round(total * downPct / 100);
  const financed = total - down;
  const monthly = Math.ceil((financed + financed * intPct / 100) / months);
  return { down, monthly };
};

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [tel, setTel] = useState("");
  const [payment, setPayment] = useState<Payment>("TRANSFER");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [instOpts, setInstOpts] = useState<InstallmentOptions | null>(null);
  const [months, setMonths] = useState<number | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { router.replace("/login?redirect=/checkout"); return; }
    try { const user = JSON.parse(u); if (user.name) setName(user.name); } catch { /* */ }
  }, [router]);

  useEffect(() => {
    api.get("/installment/options")
      .then((res) => { setInstOpts(res.data); if (res.data?.months?.length) setMonths(res.data.months[0]); })
      .catch(() => { /* ผ่อนไม่พร้อมก็ซ่อนตัวเลือก */ });
  }, []);

  const plan = (instOpts && months) ? planPreview(total, months, instOpts.downPercent, instOpts.interestPercent) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error("ตะกร้าว่างเปล่า"); return; }
    if (!name.trim() || !tel.trim()) { toast.error("กรอกชื่อและเบอร์โทรผู้รับ"); return; }
    if (payment !== "PICKUP" && !address.trim()) { toast.error("กรอกที่อยู่จัดส่ง"); return; }
    if (payment === "INSTALLMENT" && !months) { toast.error("เลือกจำนวนงวดผ่อน"); return; }

    setSubmitting(true);
    try {
      const res = await api.post("/orders", {
        items: items.map((i) => ({ catalogId: i.catalogId, quantity: i.quantity })),
        paymentMethod: payment,
        customerName: name.trim(),
        customerTel: tel.trim(),
        shippingAddress: payment !== "PICKUP" ? address.trim() : null,
        note: note.trim() || null,
        installmentMonths: payment === "INSTALLMENT" ? months : null,
      });
      clear();
      toast.success("สร้างคำสั่งซื้อสำเร็จ!");
      router.push(`/orders/${res.data.id}`);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) { router.replace("/login?redirect=/checkout"); return; }
      toast.error(err?.response?.data?.message || "สร้างคำสั่งซื้อไม่สำเร็จ");
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

            {/* วิธีรับสินค้า/ชำระเงิน */}
            <div className="card-dd">
              <h2 className="mb-4 font-bold text-text-heading">วิธีชำระเงิน</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button type="button" onClick={() => setPayment("TRANSFER")} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${payment === "TRANSFER" ? "border-yellow bg-yellow/10" : "border-border-default hover:border-yellow"}`}>
                  <Banknote size={22} className="mt-0.5 text-yellow-hover" />
                  <div>
                    <p className="font-semibold text-text-heading">โอน / PromptPay</p>
                    <p className="text-xs text-text-muted">โอนเต็มจำนวน แนบสลิป</p>
                  </div>
                </button>
                {instOpts && instOpts.months.length > 0 && (
                  <button type="button" onClick={() => setPayment("INSTALLMENT")} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${payment === "INSTALLMENT" ? "border-yellow bg-yellow/10" : "border-border-default hover:border-yellow"}`}>
                    <CreditCard size={22} className="mt-0.5 text-yellow-hover" />
                    <div>
                      <p className="font-semibold text-text-heading">ผ่อนชำระ</p>
                      <p className="text-xs text-text-muted">ดาวน์ {instOpts.downPercent}% ที่เหลือผ่อนเป็นงวด</p>
                    </div>
                  </button>
                )}
                <button type="button" onClick={() => setPayment("PICKUP")} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${payment === "PICKUP" ? "border-yellow bg-yellow/10" : "border-border-default hover:border-yellow"}`}>
                  <Store size={22} className="mt-0.5 text-yellow-hover" />
                  <div>
                    <p className="font-semibold text-text-heading">นัดรับที่ร้าน</p>
                    <p className="text-xs text-text-muted">จองไว้ จ่ายตอนรับเครื่อง</p>
                  </div>
                </button>
              </div>

              {/* เลือกงวดผ่อน + preview */}
              {payment === "INSTALLMENT" && instOpts && (
                <div className="mt-4 rounded-xl border border-border-default bg-bg-subtle p-4">
                  <label className="label-dd">เลือกจำนวนงวด</label>
                  <div className="flex flex-wrap gap-2">
                    {instOpts.months.map((m) => (
                      <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${months === m ? "border-yellow bg-yellow text-text-heading" : "border-border-default bg-white text-text-body hover:border-yellow"}`}>
                        {m} เดือน
                      </button>
                    ))}
                  </div>
                  {plan && (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-text-muted">เงินดาวน์ (จ่ายวันนี้)</p>
                        <p className="text-lg font-bold text-price">{money(plan.down)}</p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs text-text-muted">ผ่อน/เดือน × {months}</p>
                        <p className="text-lg font-bold text-text-heading">{money(plan.monthly)}</p>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-text-muted">* ยอดสุทธิ server คำนวณอีกครั้งตอนยืนยัน · วันนี้ชำระเฉพาะเงินดาวน์</p>
                </div>
              )}

              {payment !== "PICKUP" && (
                <div className="mt-4">
                  <label className="label-dd">ที่อยู่จัดส่ง *</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required className="input-dd resize-none" placeholder="บ้านเลขที่ / ถนน / ตำบล / อำเภอ / จังหวัด / รหัสไปรษณีย์" />
                </div>
              )}
              <div className="mt-4">
                <label className="label-dd">หมายเหตุ (ถ้ามี)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} className="input-dd" placeholder="เช่น สีที่ต้องการ / เวลานัดรับ" />
              </div>
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
              {payment === "INSTALLMENT" && plan ? (
                <>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-text-muted">ราคาสินค้ารวม</span>
                    <span className="font-semibold text-text-heading">{money(total)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border-default pt-3">
                    <span className="font-bold text-text-heading">ชำระวันนี้ (ดาวน์)</span>
                    <span className="text-xl font-bold text-price">{money(plan.down)}</span>
                  </div>
                  <p className="mt-1 text-right text-xs text-text-muted">แล้วผ่อน {money(plan.monthly)} × {months} เดือน</p>
                </>
              ) : (
                <div className="mt-4 flex items-center justify-between border-t border-border-default pt-3">
                  <span className="font-bold text-text-heading">รวมทั้งสิ้น</span>
                  <span className="text-xl font-bold text-price">{money(total)}</span>
                </div>
              )}
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
