import api from "@/lib/api";

/**
 * Data boundary ของ Employee Workbench (S14/OPS-01)
 * เรียก /ops/** (พนักงานเข้าได้) · action คุมสิทธิ์ที่ server รายตัว — allowedActions มาจาก server เท่านั้น
 */

export interface OpsIdentity {
  email: string;
  role: string | null;
  permissions: string[];
}

export interface WorkOrder {
  id: number;
  status: string;
  queue: string;
  customerName: string;
  customerTelMasked: string;
  total: number;
  paymentMethod: string;
  delivery: boolean;
  createdAt: string | null;
  priority: string | null;
  assignedTo: string | null;
  assignedAt: string | null;
  dueAt: string | null;
  overdue: boolean;
  allowedActions: string[];
  version: number;
}

export interface PagedWork {
  content: WorkOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type Assigned = "ANY" | "UNASSIGNED" | "MINE";

export interface QueueMeta { key: string; label: string; hint: string }

// คิวงานตรงกับ backend enum WorkQueue — RECONCILIATION โชว์เฉพาะผู้มีสิทธิ์ (ดู visibleQueues)
export const QUEUES: QueueMeta[] = [
  { key: "PAYMENT_REVIEW", label: "ตรวจสลิป", hint: "ลูกค้าแนบสลิปแล้ว รอตรวจ/ยืนยัน" },
  { key: "PICKUP_CONFIRM", label: "ยืนยันรับที่ร้าน", hint: "ลูกค้าจองรับที่ร้าน รอยืนยันคิว" },
  { key: "PREPARE", label: "เตรียมของ", hint: "ยืนยันแล้ว รอแพ็ก" },
  { key: "SHIP", label: "พร้อมส่ง", hint: "แพ็กแล้ว รอออกจัดส่ง" },
  { key: "PICKUP_READY", label: "ให้ลูกค้ามารับ", hint: "เตรียมให้ลูกค้ามารับที่ร้าน" },
  { key: "RECONCILIATION", label: "งานผิดปกติ", hint: "ยอด/บิลไม่ตรง รอกระทบยอด" },
];

export interface ActionMeta { label: string; danger?: boolean; form?: "fulfill" | "refund" | "resolve"; confirm?: boolean }

export const ACTION_META: Record<string, ActionMeta> = {
  CONFIRM: { label: "ยืนยันคำสั่งซื้อ", confirm: true },
  REJECT: { label: "ปฏิเสธคำสั่งซื้อ", danger: true, confirm: true },
  VIEW_SLIP: { label: "ดูสลิป" },
  FULFILL: { label: "อัปเดตการจัดส่ง", form: "fulfill" },
  RESOLVE_RECONCILIATION: { label: "ปิดงานกระทบยอด", form: "resolve" },
  REFUND_REQUEST: { label: "ขอคืนเงิน", danger: true, form: "refund" },
};

/** คิวที่ควรโชว์ตามสิทธิ์ (ซ่อนเพื่อ usability — server ยังปฏิเสธเองเสมอ) · admin เห็นครบ */
export function visibleQueues(permissions: string[], role: string | null): QueueMeta[] {
  const admin = role === "ROLE_ADMIN";
  return QUEUES.filter((q) => q.key !== "RECONCILIATION" || admin || permissions.includes("RECONCILIATION_VIEW"));
}

/** ป้าย SLA จาก dueAt/overdue เทียบเวลาปัจจุบัน — คืน label + ระดับความเร่งด่วน (ทดสอบได้, ไม่พึ่ง DOM) */
export function slaLabel(dueAt: string | null, overdue: boolean, nowMs: number): { text: string; level: "overdue" | "soon" | "ok" | "none" } {
  if (!dueAt) return { text: "—", level: "none" };
  const diff = new Date(dueAt).getTime() - nowMs;
  if (isNaN(diff)) return { text: "—", level: "none" };
  if (overdue || diff <= 0) return { text: "เกินกำหนด", level: "overdue" };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { text: `เหลือ ${mins} นาที`, level: mins <= 15 ? "soon" : "ok" };
  const hrs = Math.floor(mins / 60);
  return { text: `เหลือ ${hrs} ชม.`, level: "ok" };
}

/** สถานะจัดส่งถัดไปที่อนุญาต (mirror backend NEXT_STATUS) — ใช้สร้างฟอร์ม FULFILL ให้เลือกเฉพาะที่ถูกต้อง */
export function nextFulfillStatuses(status: string, delivery: boolean): string[] {
  switch (status) {
    case "CONFIRMED": return ["PREPARING"];
    case "PREPARING": return delivery ? ["SHIPPED"] : ["READY_PICKUP"];
    case "SHIPPED": return ["DELIVERED"];
    case "READY_PICKUP": return ["PICKED_UP"];
    case "DELIVERED": return ["COMPLETED"];
    case "PICKED_UP": return ["COMPLETED"];
    default: return [];
  }
}

export const FULFILL_LABEL: Record<string, string> = {
  PREPARING: "เริ่มเตรียมของ", SHIPPED: "จัดส่งแล้ว (ใส่เลขพัสดุ)", READY_PICKUP: "พร้อมให้มารับ",
  DELIVERED: "ลูกค้าได้รับแล้ว", PICKED_UP: "ลูกค้ามารับแล้ว", COMPLETED: "ปิดงานสมบูรณ์",
};

// ---- API calls ----
export const opsApi = {
  me: () => api.get<OpsIdentity>("/ops/me").then((r) => r.data),
  counts: () => api.get<Record<string, number>>("/ops/work/counts").then((r) => r.data),
  list: (queue: string, assigned: Assigned, page: number, size = 25) =>
    api.get<PagedWork>("/ops/work/orders", { params: { queue, assigned, page, size } }).then((r) => r.data),
  claim: (id: number, version: number) =>
    api.post<WorkOrder>(`/ops/work/orders/${id}/claim`, null, { headers: { "If-Match": String(version) } }).then((r) => r.data),
  release: (id: number) => api.post<WorkOrder>(`/ops/work/orders/${id}/release`).then((r) => r.data),
  confirm: (id: number) => api.post(`/ops/work/orders/${id}/confirm`).then((r) => r.data),
  reject: (id: number) => api.post(`/ops/work/orders/${id}/reject`).then((r) => r.data),
  fulfillment: (id: number, status: string, shippingPartner?: string, trackingNumber?: string) =>
    api.post(`/ops/work/orders/${id}/fulfillment`, { status, shippingPartner, trackingNumber }).then((r) => r.data),
  resolve: (id: number, stockBillNo: string) =>
    api.post(`/ops/work/orders/${id}/resolve-confirmation`, { stockBillNo }).then((r) => r.data),
  refundRequest: (id: number, amount: number | null, reason: string) =>
    api.post(`/ops/work/orders/${id}/refund-requests`, { amount, reason }).then((r) => r.data),
  slipBlob: (id: number) => api.get(`/ops/work/orders/${id}/slip`, { responseType: "blob" }).then((r) => r.data as Blob),
};
