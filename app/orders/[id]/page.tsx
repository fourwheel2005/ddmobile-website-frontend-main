"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { statusOf } from "@/lib/orderStatus";
import { getApiError } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";
import { QRCodeCanvas } from "qrcode.react";
import {
  Loader2, Smartphone, ArrowLeft, UploadCloud, Banknote, Store, Truck,
  CheckCircle2, AlertTriangle, ShieldCheck, Package
} from "lucide-react";

interface OItem {
  kind: string; productName: string; condition: string; color: string | null;
  storage: string | null; imei: string | null; unitPrice: number; quantity: number; lineTotal: number;
}
interface Order {
  id: number; status: string; paymentMethod: string; customerName: string; customerTel: string;
  shippingAddress: string | null; note: string | null; subtotal: number; total: number;
  items: OItem[]; slipFileId: string | null; slipVerified: boolean | null; createdAt: string;
  installmentMonths: number | null; downPayment: number | null; monthlyPayment: number | null;
}

const money = (v: number) => "฿" + Number(v).toLocaleString();
const condLabel = (c: string) => (c === "NEW" ? "มือ 1" : "มือ 2");

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [ppPayload, setPpPayload] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
      if (res.data.slipFileId) {
        try {
          const blob = await api.get(`/orders/${id}/slip`, { responseType: "blob" });
          setSlipPreview(URL.createObjectURL(blob.data));
        } catch { /* slip โหลดไม่ได้ ไม่เป็นไร */ }
      }
      // ดึง PromptPay payload (โอน/ผ่อน + ยังไม่ปิดออเดอร์ + ร้านตั้ง PromptPay ID ไว้)
      if (["TRANSFER", "INSTALLMENT"].includes(res.data.paymentMethod) && ["RESERVED", "PENDING_REVIEW"].includes(res.data.status)) {
        try {
          const pp = await api.get(`/orders/${id}/promptpay`);
          if (pp.status === 200 && pp.data?.payload) setPpPayload(pp.data.payload);
        } catch { /* ไม่มี QR ก็ใช้แนบสลิปปกติ */ }
      }
    } catch (err: any) {
      if ([401, 403].includes(err?.response?.status)) { router.replace("/login?redirect=/orders"); return; }
      toast.error("ไม่พบคำสั่งซื้อนี้");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!localStorage.getItem("user")) { router.replace(`/login?redirect=/orders/${id}`); return; }
    load();
  }, [id, load, router]);

  const uploadSlip = async (file: File) => {
    setUploading(true);
    try {
      const compressed = await compressImage(file);   // บีบก่อนอัป (รูปสลิปจากมือถือมักใหญ่)
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await api.post(`/orders/${id}/slip`, fd);
      setOrder(res.data);
      setSlipPreview(URL.createObjectURL(compressed));
      toast.success("แนบสลิปสำเร็จ รอแอดมินตรวจสอบ");
    } catch (err: any) {
      toast.error(getApiError(err, "แนบสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-bg-base text-yellow-hover"><Loader2 size={40} className="animate-spin" /></div>;
  if (!order) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 text-center">
      <Package size={56} className="mb-5 text-text-disabled" />
      <h1 className="text-2xl font-bold text-text-heading">ไม่พบคำสั่งซื้อ</h1>
      <Link href="/orders" className="btn-primary mt-6">ดูคำสั่งซื้อทั้งหมด</Link>
    </div>
  );

  const s = statusOf(order.status);
  const StatusIcon = s.icon;
  const isInstallment = order.paymentMethod === "INSTALLMENT";
  const isDelivery = order.paymentMethod !== "PICKUP";
  const payNow = isInstallment && order.downPayment != null ? order.downPayment : order.total;

  return (
    <div className="page-wrapper min-h-screen bg-bg-base">
      <div className="container-dd py-6 md:py-10">
        <Link href="/orders" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-heading">
          <ArrowLeft size={18} /> คำสั่งซื้อทั้งหมด
        </Link>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-text-heading md:text-3xl">ออเดอร์ #{order.id}</h1>
          <span className={`badge-dd ${s.cls}`}><StatusIcon size={13} /> {s.label}</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ซ้าย: รายการ + ที่อยู่ */}
          <div className="space-y-6 lg:col-span-2">
            <div className="card-dd">
              <h2 className="mb-4 font-bold text-text-heading">รายการสินค้า</h2>
              <div className="space-y-3">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-3 border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-bg-subtle"><Smartphone size={20} className="text-text-disabled" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-heading">{it.productName}</p>
                      <p className="text-xs text-text-muted">{condLabel(it.condition)}{[it.color, it.storage].filter(Boolean).map((x) => ` · ${x}`).join("")} · x{it.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-text-heading">{money(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border-default pt-3">
                <span className="font-bold text-text-heading">รวมทั้งสิ้น</span>
                <span className="text-xl font-bold text-price">{money(order.total)}</span>
              </div>
            </div>

            <div className="card-dd">
              <h2 className="mb-3 font-bold text-text-heading">ข้อมูลการรับสินค้า</h2>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2"><span className="w-24 flex-shrink-0 text-text-muted">ผู้รับ</span><span className="font-medium text-text-heading">{order.customerName} · {order.customerTel}</span></div>
                <div className="flex gap-2">
                  <span className="w-24 flex-shrink-0 text-text-muted">วิธีรับ</span>
                  <span className="flex items-center gap-1.5 font-medium text-text-heading">
                    {isDelivery ? <><Truck size={15} /> จัดส่งถึงบ้าน</> : <><Store size={15} /> นัดรับที่ร้าน</>}
                  </span>
                </div>
                {order.shippingAddress && <div className="flex gap-2"><span className="w-24 flex-shrink-0 text-text-muted">ที่อยู่</span><span className="text-text-body">{order.shippingAddress}</span></div>}
                {order.note && <div className="flex gap-2"><span className="w-24 flex-shrink-0 text-text-muted">หมายเหตุ</span><span className="text-text-body">{order.note}</span></div>}
              </div>
            </div>
          </div>

          {/* ขวา: ชำระเงิน */}
          <div className="lg:col-span-1">
            <div className="card-dd sticky top-20">
              <h2 className="mb-3 flex items-center gap-2 font-bold text-text-heading"><Banknote size={18} className="text-yellow-hover" /> การชำระเงิน</h2>

              {isInstallment && order.downPayment != null && (
                <div className="mb-3 rounded-xl border border-border-default bg-bg-subtle p-3 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">ราคาเต็ม</span><span className="font-semibold text-text-heading">{money(order.total)}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-text-muted">เงินดาวน์</span><span className="font-semibold text-price">{money(order.downPayment)}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-text-muted">ผ่อน/เดือน</span><span className="font-semibold text-text-heading">{money(order.monthlyPayment ?? 0)} × {order.installmentMonths} เดือน</span></div>
                </div>
              )}
              {order.status === "CONFIRMED" ? (
                <div className="rounded-xl border border-success-border bg-success-bg p-4 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-success-text" />
                  <p className="font-semibold text-success-text">ยืนยันคำสั่งซื้อแล้ว</p>
                  <p className="mt-1 text-xs text-text-muted">แอดมินกำลังจัดเตรียมสินค้าให้</p>
                </div>
              ) : order.status === "REJECTED" ? (
                <div className="rounded-xl border border-error-border bg-error-bg p-4 text-center text-sm text-error-text">คำสั่งซื้อถูกปฏิเสธ — ติดต่อแอดมินทางไลน์</div>
              ) : order.status === "PENDING_PICKUP" ? (
                <div className="rounded-xl border border-info-border bg-info-bg p-4 text-sm text-info-text">
                  <Store size={20} className="mb-1" /> จองสำเร็จ! กรุณามารับและชำระเงินที่ร้าน รอแอดมินติดต่อยืนยันคิว
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-bg-subtle p-4 text-center">
                    <p className="text-xs text-text-muted">{isInstallment ? "เงินดาวน์ที่ต้องชำระวันนี้" : "ยอดที่ต้องชำระ"}</p>
                    <p className="text-2xl font-bold text-price">{money(payNow)}</p>
                    {ppPayload ? (
                      <div className="mt-3 flex flex-col items-center">
                        <div className="rounded-xl border border-border-default bg-white p-3">
                          <QRCodeCanvas value={ppPayload} size={172} />
                        </div>
                        <p className="mt-2 text-xs text-text-muted">สแกนด้วยแอปธนาคาร / พร้อมเพย์ แล้วแนบสลิปด้านล่าง</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-text-muted">โอน/พร้อมเพย์มาที่ร้าน แล้วแนบสลิปด้านล่าง (ขอเลขบัญชีได้ทางไลน์)</p>
                    )}
                  </div>

                  <label className="mt-4 block cursor-pointer">
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default bg-white p-5 text-center transition-colors hover:border-yellow">
                      {uploading ? <Loader2 size={26} className="mb-2 animate-spin text-yellow-hover" /> : <UploadCloud size={26} className="mb-2 text-text-muted" />}
                      <p className="text-sm font-medium text-text-body">{order.slipFileId ? "เปลี่ยนสลิป" : "แนบสลิปการโอน"}</p>
                      <p className="text-xs text-text-muted">JPG / PNG ไม่เกิน 25MB (ระบบย่อรูปอัตโนมัติ)</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSlip(f); e.target.value = ""; }} />
                  </label>

                  {slipPreview && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-text-muted">สลิปที่แนบ</p>
                      <img src={slipPreview} alt="สลิปการโอน" className="w-full rounded-xl border border-border-default" />
                    </div>
                  )}
                  {order.slipFileId && (
                    order.slipVerified === true ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success-text"><CheckCircle2 size={14} /> ตรวจสลิปอัตโนมัติผ่าน (ยอดตรง) · รอแอดมินยืนยัน</p>
                    ) : order.slipVerified === false ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-error-text"><AlertTriangle size={14} /> สลิปยอดไม่ตรง/อาจซ้ำ — แอดมินจะตรวจสอบอีกครั้ง</p>
                    ) : (
                      <p className="mt-2 text-xs text-text-muted">⏳ รอแอดมินตรวจสอบสลิป</p>
                    )
                  )}
                </>
              )}

              <p className="mt-4 flex items-center gap-1.5 text-xs text-text-muted"><ShieldCheck size={14} /> ระบบจองสินค้าให้แล้ว ของจะถูกกันไว้จนกว่าแอดมินยืนยัน</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
