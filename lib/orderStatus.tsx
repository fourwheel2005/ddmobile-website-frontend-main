import { Clock, CheckCircle2, XCircle, Store, Package, Truck, ShoppingBag, PartyPopper } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface StatusMeta { label: string; cls: string; icon: LucideIcon; }

export const ORDER_STATUS: Record<string, StatusMeta> = {
  RESERVED: { label: "รอแนบสลิป", cls: "badge-warning", icon: Clock },
  PENDING_REVIEW: { label: "รอแอดมินตรวจสอบ", cls: "badge-info", icon: Clock },
  PENDING_PICKUP: { label: "รอรับที่ร้าน", cls: "badge-info", icon: Store },
  CONFIRMED: { label: "ยืนยันแล้ว", cls: "badge-success", icon: CheckCircle2 },
  PREPARING: { label: "กำลังเตรียมของ", cls: "badge-info", icon: Package },
  SHIPPED: { label: "กำลังจัดส่ง", cls: "badge-info", icon: Truck },
  DELIVERED: { label: "จัดส่งสำเร็จ", cls: "badge-success", icon: CheckCircle2 },
  READY_PICKUP: { label: "พร้อมรับที่ร้าน", cls: "badge-info", icon: ShoppingBag },
  PICKED_UP: { label: "รับเครื่องแล้ว", cls: "badge-success", icon: CheckCircle2 },
  COMPLETED: { label: "เสร็จสมบูรณ์", cls: "badge-success", icon: PartyPopper },
  REJECTED: { label: "ถูกปฏิเสธ", cls: "badge-error", icon: XCircle },
  CANCELLED: { label: "ยกเลิก", cls: "badge-error", icon: XCircle },
  REFUNDED: { label: "คืนเงินแล้ว", cls: "badge-error", icon: XCircle },
};

export const statusOf = (s: string): StatusMeta => ORDER_STATUS[s] || ORDER_STATUS.RESERVED;
