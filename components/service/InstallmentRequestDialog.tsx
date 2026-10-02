"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CreditCard, X } from "lucide-react";
import { useEscapeKey } from "@/lib/useEscapeKey";
import type { InstallmentInterest } from "@/lib/serviceRequest";
import ServiceRequestForm from "./ServiceRequestForm";

/**
 * "ยืนยันผ่อนเครื่องนี้" จากหน้าสินค้า — ฟอร์มผ่อนเครื่อง (บัตรประชาชน + ยินยอม + ติดต่อกลับ)
 * พร้อม snapshot เครื่อง/แผนที่ลูกค้าเลือก → บันทึกเข้าระบบ แล้วกดเปิด LINE พร้อมเลขอ้างอิง
 *
 * ปิดได้ด้วยปุ่ม X / Esc เท่านั้น — คลิกพื้นหลังไม่ปิด (กันแตะพลาดแล้วรูปบัตร/ข้อมูลที่กรอกหาย)
 * ผู้เรียกควร import แบบ dynamic (โหลด JS ของฟอร์มเมื่อกดปุ่มจริงเท่านั้น)
 */
export default function InstallmentRequestDialog({ product, onClose }: {
  product: InstallmentInterest;
  onClose: () => void;
}) {
  useEscapeKey(true, onClose);

  // ล็อกการเลื่อนหน้าหลังโมดัล (มือถือเลื่อนทะลุแล้วหลงตำแหน่ง)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="inst-dialog-title">
      <div className="relative my-auto max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border-default bg-bg-base p-4 shadow-[0_24px_60px_rgba(16,24,40,0.22)] sm:p-6">
        <button type="button" onClick={onClose} aria-label="ปิด" className="modal-close"><X size={20} /></button>
        <div className="mb-4 flex items-center gap-2 pr-12">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-yellow/20 text-yellow-hover"><CreditCard size={18} /></span>
          <div className="min-w-0">
            <h2 id="inst-dialog-title" className="text-lg font-bold text-text-heading">ยืนยันผ่อนเครื่องนี้</h2>
            <p className="truncate text-xs text-text-muted">{product.productName}</p>
          </div>
        </div>
        <ServiceRequestForm initialServices={["INSTALLMENT"]} lockedServices={["INSTALLMENT"]} presetInstallment={product} />
      </div>
    </div>,
    document.body,
  );
}
