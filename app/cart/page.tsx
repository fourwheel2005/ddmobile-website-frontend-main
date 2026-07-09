"use client";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Minus, Plus, Smartphone, ArrowRight, Sparkles, RotateCcw } from "lucide-react";

import { baht as money } from "@/lib/money";

export default function CartPage() {
  const { items, total, count, remove, setQty, clear } = useCart();
  const router = useRouter();

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
          <h1 className="text-2xl font-bold text-text-heading">ตะกร้าว่างเปล่า</h1>
          <p className="mt-2 text-sm text-text-muted">ยังไม่มีสินค้าในตะกร้า ลองเลือกชมสินค้าก่อนนะครับ</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex">เลือกซื้อสินค้า <ArrowRight size={18} /></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-8 md:py-12">
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-2xl font-bold text-text-heading md:text-3xl">ตะกร้าสินค้า <span className="text-base font-normal text-text-muted">({count} ชิ้น)</span></h1>
          <button onClick={clear} className="text-sm text-text-muted hover:text-error-text">ล้างตะกร้า</button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* รายการ */}
          <Reveal className="reveal-stagger space-y-3 lg:col-span-2">
            {items.map((it) => (
              <div key={it.catalogId} className="card-dd flex gap-4 !p-3">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle">
                  {it.imageUrl ? <img src={it.imageUrl} alt={it.productName} className="h-full w-full object-contain p-1" /> : <Smartphone size={28} className="text-text-disabled" />}
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
                      <div className="flex items-center gap-2">
                        <button onClick={() => setQty(it.catalogId, it.quantity - 1)} aria-label="ลด" className="flex h-7 w-7 items-center justify-center rounded-full border border-border-default text-text-body hover:border-yellow disabled:opacity-30" disabled={it.quantity <= 1}><Minus size={13} /></button>
                        <span className="w-7 text-center text-sm font-semibold">{it.quantity}</span>
                        <button onClick={() => setQty(it.catalogId, it.quantity + 1)} aria-label="เพิ่ม" className="flex h-7 w-7 items-center justify-center rounded-full border border-border-default text-text-body hover:border-yellow disabled:opacity-30" disabled={it.quantity >= it.maxStock}><Plus size={13} /></button>
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
              <button onClick={goCheckout} className="btn-primary mt-5 w-full py-3.5 text-base">
                ดำเนินการชำระเงิน <ArrowRight size={18} />
              </button>
              <Link href="/products" className="mt-3 block text-center text-sm text-text-muted hover:text-text-heading">เลือกซื้อสินค้าเพิ่ม</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
