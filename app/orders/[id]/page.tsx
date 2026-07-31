"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { statusOf } from "@/lib/orderStatus";
import { getApiError, getApiStatus } from "@/lib/errorMessage";
import { compressImage } from "@/lib/imageCompress";
import DeliveryTracker from "@/components/DeliveryTracker";
import ReviewBox from "@/components/ReviewBox";
import { QRCodeCanvas } from "qrcode.react";
import {
  Loader2, Smartphone, ArrowLeft, UploadCloud, Banknote, Store, Truck, Clock,
  CheckCircle2, AlertTriangle, ShieldCheck, Package
} from "lucide-react";

interface OItem {
  kind: string; productName: string; condition: string; color: string | null;
  storage: string | null; imei: string | null; imageUrl: string | null;
  unitPrice: number; quantity: number; lineTotal: number;
}
interface Order {
  id: number; status: string; paymentMethod: string; customerName: string; customerTel: string;
  shippingAddress: string | null; note: string | null; subtotal: number; total: number;
  couponCode: string | null; discountPercent: number | null; discountAmount: number | null;
  promoNames: string | null; promoDiscount: number | null;
  items: OItem[]; slipFileId: string | null; slipVerified: boolean | null; slipAmount: number | null;
  slipTransferAt: string | null; slipBankAccount: string | null; createdAt: string;
  installmentMonths: number | null; downPayment: number | null; monthlyPayment: number | null;
  shippingPartner: string | null; trackingNumber: string | null;
  confirmedAt: string | null; preparingAt: string | null; shippedAt: string | null;
  deliveredAt: string | null; completedAt: string | null;
  refundedAt: string | null; refundAmount: number | null; refundReason: string | null;
  receiptNo: string | null;        // เลขบิลจากระบบคลัง — หลักฐานอ้างอิง (มีหลังยืนยันแล้ว)
  reserveExpiresAt: string | null; // เส้นตายแนบสลิป (เฉพาะ RESERVED) — โชว์นับถอยหลัง
}

const FULFILLMENT = ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "READY_PICKUP", "PICKED_UP", "COMPLETED"];

import { baht as money } from "@/lib/money";
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
  // ข้อมูลการโอนที่ลูกค้าแจ้ง (แนบคู่กับสลิป) — ให้แอดมินเทียบเดินบัญชีได้แม่นยำ
  const [accounts, setAccounts] = useState<string[]>([]);   // บัญชีร้านจาก config (ว่าง = ซ่อน dropdown)
  const [transferDate, setTransferDate] = useState("");
  const [transferTime, setTransferTime] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [nowTs, setNowTs] = useState(() => Date.now());     // นาฬิกาเดินทุกวิ — ขับนับถอยหลังเวลาจอง

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
      if (res.data.slipFileId) {
        try {
          const blob = await api.get(`/orders/${id}/slip`, { responseType: "blob" });
          setSlipPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob.data); });
        } catch { /* slip โหลดไม่ได้ ไม่เป็นไร */ }
      }
      // ดึง PromptPay payload (โอน/ผ่อน + ยังไม่ปิดออเดอร์ + ร้านตั้ง PromptPay ID ไว้)
      if (["TRANSFER", "INSTALLMENT"].includes(res.data.paymentMethod) && ["RESERVED", "PENDING_REVIEW"].includes(res.data.status)) {
        try {
          const pp = await api.get(`/orders/${id}/promptpay`);
          if (pp.status === 200 && pp.data?.payload) setPpPayload(pp.data.payload);
        } catch { /* ไม่มี QR ก็ใช้แนบสลิปปกติ */ }
        // บัญชีร้านให้เลือกตอนแนบสลิป — ร้านไม่ตั้งไว้ = list ว่าง → ซ่อน dropdown
        api.get("/orders/payment-accounts")
          .then((r) => setAccounts(Array.isArray(r.data) ? r.data : []))
          .catch(() => { /* โหลดไม่ได้ → ไม่บังคับเลือก */ });
      }
    } catch (err: unknown) {
      if ([401, 403].includes(getApiStatus(err) ?? 0)) { router.replace("/login?redirect=/orders"); return; }
      toast.error("ไม่พบคำสั่งซื้อนี้");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!localStorage.getItem("user")) { router.replace(`/login?redirect=/orders/${id}`); return; }
    load();
  }, [id, load, router]);

  // คืน blob URL ของสลิปตอนออกจากหน้า (กัน memory leak)
  useEffect(() => () => { if (slipPreview) URL.revokeObjectURL(slipPreview); }, [slipPreview]);

  // เดินนาฬิกาทุกวินาทีเฉพาะตอนออเดอร์ยังรอสลิป (ขับนับถอยหลัง) — สถานะอื่นไม่ตั้ง interval
  const ticking = order?.status === "RESERVED" && !!order.reserveExpiresAt;
  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ticking]);

  const uploadSlip = async (file: File) => {
    // ต้องแจ้งวันเวลาโอน (+เลือกบัญชี ถ้าร้านตั้งรายการไว้) ก่อนแนบ — แอดมินใช้เทียบเดินบัญชี
    if (!transferDate || !transferTime) { toast.error("กรุณาระบุวันที่และเวลาที่โอนก่อนแนบสลิป"); return; }
    if (accounts.length > 0 && !bankAccount) { toast.error("กรุณาเลือกบัญชีที่โอนเข้า"); return; }
    setUploading(true);
    try {
      const compressed = await compressImage(file);   // บีบก่อนอัป (รูปสลิปจากมือถือมักใหญ่)
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("transferAt", `${transferDate}T${transferTime}`);   // ISO ให้ backend parse ตรง ๆ
      if (bankAccount) fd.append("bankAccount", bankAccount);
      const res = await api.post(`/orders/${id}/slip`, fd);
      setOrder(res.data);
      setSlipPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(compressed); });
      // ตรวจสลิปอัตโนมัติผ่าน → เข้าคิวแอดมิน (สลิปผิดถูก 400 ตั้งแต่ upload — ไม่ถึงตรงนี้)
      toast.success(res.data?.slipVerified
        ? "ตรวจสลิปผ่าน ยอดตรง! รอแอดมินอนุมัติ"
        : "แนบสลิปสำเร็จ รอแอดมินตรวจสอบ");
    } catch (err: unknown) {
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
  // นับถอยหลังเวลาจอง (P1-4) — เกินกำหนดระบบปล่อยจองอัตโนมัติ ลูกค้าต้องเห็นก่อนโดนยกเลิก
  const expiryTs = order.status === "RESERVED" && order.reserveExpiresAt ? new Date(order.reserveExpiresAt).getTime() : null;
  const remainMs = expiryTs != null ? expiryTs - nowTs : null;
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
            {FULFILLMENT.includes(order.status) && <DeliveryTracker order={order} />}

            {/* ให้คะแนนหลังได้รับสินค้า (โชว์เฉพาะสถานะรับของแล้ว) */}
            <ReviewBox orderId={order.id} status={order.status} />

            <div className="card-dd">
              <h2 className="mb-4 font-bold text-text-heading">รายการสินค้า</h2>
              <div className="space-y-3">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-3 border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-subtle">
                      {it.imageUrl
                        ? <Image src={it.imageUrl} alt={it.productName} width={48} height={48} sizes="48px" className="h-full w-full object-contain p-0.5" />
                        : <Smartphone size={20} className="text-text-disabled" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-heading">{it.productName}</p>
                      <p className="text-xs text-text-muted">{condLabel(it.condition)}{[it.color, it.storage].filter(Boolean).map((x) => ` · ${x}`).join("")} · x{it.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-text-heading">{money(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5 border-t border-border-default pt-3">
                {((order.discountAmount != null && order.discountAmount > 0) || (order.promoDiscount != null && order.promoDiscount > 0)) && (
                  <div className="flex justify-between text-sm"><span className="text-text-muted">ราคาสินค้า</span><span className="font-medium text-text-heading">{money(order.subtotal ?? order.total)}</span></div>
                )}
                {order.discountAmount != null && order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-success-text"><span>ส่วนลดคูปอง{order.couponCode ? ` (${order.couponCode})` : ""}</span><span className="font-semibold">−{money(order.discountAmount)}</span></div>
                )}
                {order.promoDiscount != null && order.promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-success-text"><span>โปรโมชั่น{order.promoNames ? ` (${order.promoNames})` : ""}</span><span className="font-semibold">−{money(order.promoDiscount)}</span></div>
                )}
                <div className="flex items-center justify-between border-t border-border-default pt-2">
                  <span className="font-bold text-text-heading">รวมทั้งสิ้น</span>
                  <span className="text-xl font-bold text-price">{money(order.total)}</span>
                </div>
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
              {FULFILLMENT.includes(order.status) ? (
                <div className="rounded-xl border border-success-border bg-success-bg p-4 text-center">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-success-text" />
                  <p className="font-semibold text-success-text">ชำระเงิน/ยืนยันแล้ว</p>
                  {order.receiptNo && (
                    <p className="mt-1.5 text-xs text-text-body">เลขที่บิล/ใบเสร็จ: <span className="font-mono font-semibold text-text-heading">{order.receiptNo}</span></p>
                  )}
                  <p className="mt-1 text-xs text-text-muted">ติดตามสถานะการจัดส่งได้ที่แผงด้านซ้าย</p>
                </div>
              ) : order.status === "REFUNDED" ? (
                <div className="rounded-xl border border-error-border bg-error-bg p-4 text-sm">
                  <p className="font-semibold text-error-text">คืนเงินแล้ว {order.refundAmount != null ? `฿${order.refundAmount.toLocaleString()}` : ""}</p>
                  {order.refundedAt && <p className="mt-1 text-xs text-text-muted">วันที่ {new Date(order.refundedAt).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</p>}
                  {order.refundReason && <p className="mt-1 text-xs text-text-muted">เหตุผล: {order.refundReason}</p>}
                  <p className="mt-2 text-xs text-text-muted">เงินจะโอนกลับช่องทางเดิม หากยังไม่ได้รับภายใน 3 วันทำการ ติดต่อแอดมินทางไลน์</p>
                </div>
              ) : order.status === "REJECTED" ? (
                <div className="rounded-xl border border-error-border bg-error-bg p-4 text-center text-sm text-error-text">คำสั่งซื้อถูกปฏิเสธ — ติดต่อแอดมินทางไลน์</div>
              ) : order.status === "CANCELLED" ? (
                <div className="rounded-xl border border-error-border bg-error-bg p-4 text-center text-sm text-error-text">คำสั่งซื้อถูกยกเลิก (หมดเวลาชำระเงิน) — สั่งซื้อใหม่ได้เลย</div>
              ) : order.status === "PENDING_PICKUP" ? (
                <div className="rounded-xl border border-info-border bg-info-bg p-4 text-sm text-info-text">
                  <Store size={20} className="mb-1" /> จองสำเร็จ! กรุณามารับและชำระเงินที่ร้าน รอแอดมินติดต่อยืนยันคิว
                </div>
              ) : (
                <>
                  {/* นับถอยหลังเวลาจอง — เกินกำหนดระบบปล่อยจองอัตโนมัติ (P1-4) */}
                  {remainMs != null && (
                    remainMs > 0 ? (
                      <div className={`mb-3 flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold ${remainMs < 10 * 60_000 ? "border-error-border bg-error-bg text-error-text" : "border-yellow bg-yellow/10 text-text-heading"}`}>
                        <Clock size={16} className="flex-shrink-0" />
                        ชำระภายใน <span className="font-mono tabular-nums text-base">{String(Math.floor(remainMs / 60_000)).padStart(2, "0")}:{String(Math.floor((remainMs % 60_000) / 1000)).padStart(2, "0")}</span> นาที ไม่งั้นการจองจะหลุด
                      </div>
                    ) : (
                      <div className="mb-3 rounded-xl border border-error-border bg-error-bg p-3 text-center text-sm font-semibold text-error-text">
                        เลยกำหนดชำระแล้ว — ออเดอร์จะถูกยกเลิกอัตโนมัติ ถ้าโอนแล้วให้รีบแนบสลิปทันที
                      </div>
                    )
                  )}
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

                  {/* ข้อมูลการโอน — กรอกก่อนแนบสลิป ให้แอดมินเทียบเดินบัญชีได้แม่นยำ */}
                  <div className="mt-4 space-y-3 rounded-xl border border-border-default bg-white p-4">
                    <p className="text-sm font-semibold text-text-heading">ข้อมูลการโอนของคุณ</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="tf-date" className="label-dd text-xs">วันที่โอน<span className="text-error-text" aria-hidden="true"> *</span></label>
                        <input id="tf-date" type="date" value={transferDate} max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setTransferDate(e.target.value)} className="input-dd min-h-0 py-2 text-sm" />
                      </div>
                      <div>
                        <label htmlFor="tf-time" className="label-dd text-xs">เวลาที่โอน<span className="text-error-text" aria-hidden="true"> *</span></label>
                        <input id="tf-time" type="time" value={transferTime}
                          onChange={(e) => setTransferTime(e.target.value)} className="input-dd min-h-0 py-2 text-sm" />
                      </div>
                    </div>
                    {accounts.length > 0 && (
                      <div>
                        <label htmlFor="tf-account" className="label-dd text-xs">บัญชีที่โอนเข้า<span className="text-error-text" aria-hidden="true"> *</span></label>
                        <select id="tf-account" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="input-dd min-h-0 py-2 text-sm">
                          <option value="">— เลือกบัญชีของร้านที่คุณโอนเข้า —</option>
                          {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <label className="mt-3 block cursor-pointer">
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
                      {/* blob: URL เป็นไฟล์ชั่วคราวใน browser จึงไม่ผ่าน Next image optimizer */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={slipPreview} alt="สลิปการโอน" className="w-full rounded-xl border border-border-default" />
                    </div>
                  )}
                  {order.slipFileId && order.slipTransferAt && (
                    <p className="mt-2 text-xs text-text-muted">
                      แจ้งโอนเมื่อ {new Date(order.slipTransferAt).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {order.slipBankAccount ? ` · เข้า ${order.slipBankAccount}` : ""}
                    </p>
                  )}
                  {order.slipFileId && (
                    order.slipVerified === true ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success-text"><CheckCircle2 size={14} /> ตรวจสลิปแล้ว{order.slipAmount != null ? ` ยอดโอน ฿${order.slipAmount.toLocaleString()}` : ""} ถูกต้อง · รอแอดมินอนุมัติ</p>
                    ) : order.slipVerified === false ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-error-text"><AlertTriangle size={14} /> สลิปยอดไม่ตรง/อาจซ้ำ — แอดมินจะตรวจสอบอีกครั้ง</p>
                    ) : (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-text-muted"><Clock size={14} /> รอแอดมินตรวจสอบสลิป</p>
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
