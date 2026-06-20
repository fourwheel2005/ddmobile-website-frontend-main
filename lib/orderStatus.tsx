import { Clock, CheckCircle2, XCircle, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface StatusMeta { label: string; cls: string; icon: LucideIcon; }

export const ORDER_STATUS: Record<string, StatusMeta> = {
  RESERVED: { label: "รอแนบสลิป", cls: "badge-warning", icon: Clock },
  PENDING_REVIEW: { label: "รอแอดมินตรวจสอบ", cls: "badge-info", icon: Clock },
  PENDING_PICKUP: { label: "รอรับที่ร้าน", cls: "badge-info", icon: Store },
  CONFIRMED: { label: "ยืนยันแล้ว", cls: "badge-success", icon: CheckCircle2 },
  REJECTED: { label: "ถูกปฏิเสธ", cls: "badge-error", icon: XCircle },
  CANCELLED: { label: "ยกเลิก", cls: "badge-error", icon: XCircle },
};

export const statusOf = (s: string): StatusMeta => ORDER_STATUS[s] || ORDER_STATUS.RESERVED;
