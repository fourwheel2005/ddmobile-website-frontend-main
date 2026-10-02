/**
 * ฟอร์มเลือกบริการ (ขายเครื่อง / ผ่อนเครื่อง / ผ่อนบอลลูน) — กติกา + payload + ข้อความ LINE
 *
 * ทำไมต้องอัปโหลดผ่านเว็บก่อนเปิด LINE: ลิงก์ LINE (oaMessage) พาไปได้แค่ "ข้อความ" แนบรูปไม่ได้
 * → รูปเครื่อง/บัตรประชาชนเก็บที่ระบบร้าน (ส่วนตัว แอดมินเท่านั้น) แล้วข้อความ LINE แนบ "เลขอ้างอิง" ไปแทน
 *
 * กติกาต้องตรงกับ backend `ServiceRequestRules` (หน้าเว็บตรวจก่อนอัปโหลด · server ตรวจซ้ำเสมอ)
 */
import type { ServiceCode } from "@/lib/services";
import { SERVICES, needsDevice } from "@/lib/services";
import { contactLines, deviceLines, validateContact, validateDevice, type TradeInForm } from "@/lib/tradeIn";
import { baht } from "@/lib/money";

export type PhotoSlot = "FRONT" | "BACK" | "EDGE" | "SCREEN" | "DEFECT" | "EXTRA";

export interface PhotoSlotMeta { slot: PhotoSlot; label: string; hint: string; required: boolean; }

/** ช่องรูปแนะนำ — 4 ช่องแรกบังคับสำหรับขายเครื่อง (+ อย่างน้อยอีก 1 รูป รวม ≥ 5) */
export const PHOTO_SLOTS: PhotoSlotMeta[] = [
  { slot: "FRONT", label: "ด้านหน้า", hint: "เห็นทั้งเครื่อง", required: true },
  { slot: "BACK", label: "ด้านหลัง", hint: "เห็นกล้องและฝาหลัง", required: true },
  { slot: "EDGE", label: "ขอบเครื่อง", hint: "ขอบ/มุม/ปุ่มข้าง", required: true },
  { slot: "SCREEN", label: "หน้าจอ (เปิดจอ)", hint: "พื้นขาว เห็นรอยชัด", required: true },
  { slot: "DEFECT", label: "จุดที่มีตำหนิ", hint: "ถ้าไม่มี ถ่ายมุมอื่นแทน", required: false },
];

export const MIN_SELL_PHOTOS = 5;
export const MAX_PHOTOS = 10;
/** เพดานต่อไฟล์หลังบีบ (server รับ 10MB) — เผื่อเบราว์เซอร์ที่บีบไม่ได้ */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** รวมทุกไฟล์ต่อการส่ง 1 ครั้ง — ต่ำกว่า spring.servlet.multipart.max-request-size (30MB) เผื่อ overhead */
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface PhotoItem { id: string; slot: PhotoSlot; file: File; url: string; }

export interface InstallmentInterest {
  /** มาจากหน้าสินค้า (snapshot) — ฟอร์มเลือกบริการ = ลูกค้าพิมพ์รุ่นเอง (productName) */
  catalogId?: string | null;
  productName: string;
  color?: string | null;
  storage?: string | null;
  conditionLabel?: string | null;
  serialOrSku?: string | null;
  price?: number | null;
  planLabel?: string | null;
  downPayment?: number | null;
  months?: number | null;
  monthly?: number | null;
  note?: string;
}

export interface ServiceRequestState {
  services: ServiceCode[];
  form: TradeInForm;                      // ข้อมูลเครื่อง + ผู้ติดต่อ (ชื่อ/เบอร์/ที่อยู่)
  photos: PhotoItem[];
  installment: InstallmentInterest;
  idCard: File | null;
  consent: boolean;
  /** ผ่อนเครื่อง (แนบบัตรประชาชน) ต้องล็อกอิน — ขายเครื่อง/บอลลูนไม่บังคับ (server ตรวจซ้ำ → 401) */
  loggedIn: boolean;
}

/** ช่องที่ขายเครื่องต้องมี */
export const REQUIRED_SLOTS: PhotoSlot[] = PHOTO_SLOTS.filter((s) => s.required).map((s) => s.slot);

/** ขาดช่องบังคับไหนบ้าง (โชว์ใต้ตัวอัปโหลด) */
export function missingRequiredSlots(photos: PhotoItem[]): PhotoSlot[] {
  return REQUIRED_SLOTS.filter((slot) => !photos.some((p) => p.slot === slot));
}

/** ไฟล์ที่ผ่านการบีบแล้วใช้ได้ไหม — null = ได้ */
export function checkImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "รองรับเฉพาะรูป JPG / PNG / WEBP";
  if (file.size > MAX_FILE_BYTES) return "รูปใหญ่เกิน 10MB";
  return null;
}

/** ตรวจทั้งฟอร์มตามบริการที่เลือก — คืน error แรกที่เจอ (null = ส่งได้) */
export function validateServiceRequest(s: ServiceRequestState): string | null {
  if (s.services.length === 0) return "กรุณาเลือกบริการที่ต้องการอย่างน้อย 1 อย่าง";
  if (s.services.includes("SELL") && s.services.includes("BALLOON")) {
    return "เลือกได้อย่างใดอย่างหนึ่งระหว่าง ขายเครื่อง กับ ผ่อนบอลลูน";
  }
  if (needsDevice(s.services)) {
    const err = validateDevice(s.form);
    if (err) return err;
  }
  if (s.services.includes("SELL")) {
    const missing = missingRequiredSlots(s.photos);
    if (missing.length > 0) {
      const names = PHOTO_SLOTS.filter((m) => missing.includes(m.slot)).map((m) => m.label).join(", ");
      return `ขายเครื่อง: กรุณาแนบรูป ${names}`;
    }
    if (s.photos.length < MIN_SELL_PHOTOS) return `ขายเครื่อง: ต้องแนบรูปเครื่องอย่างน้อย ${MIN_SELL_PHOTOS} รูป (ตอนนี้ ${s.photos.length} รูป)`;
  }
  if (s.photos.length > MAX_PHOTOS) return `แนบรูปได้สูงสุด ${MAX_PHOTOS} รูป`;
  const total = (needsDevice(s.services) ? s.photos.reduce((n, p) => n + p.file.size, 0) : 0)
    + (s.services.includes("INSTALLMENT") && s.idCard ? s.idCard.size : 0);
  if (total > MAX_TOTAL_BYTES) return "รูปรวมกันใหญ่เกินไป — ลองลบรูปเพิ่มเติมบางรูป หรือถ่ายใหม่";
  if (s.services.includes("INSTALLMENT")) {
    if (!s.loggedIn) return "ผ่อนเครื่อง: กรุณาเข้าสู่ระบบก่อนส่งคำขอ";
    if (!s.installment.productName.trim()) return "ผ่อนเครื่อง: กรุณาระบุรุ่นที่ต้องการผ่อน";
    if (!s.idCard) return "ผ่อนเครื่อง: กรุณาแนบรูปบัตรประชาชน";
    if (!s.consent) return "กรุณายืนยันการยินยอมให้ใช้ข้อมูลเพื่อพิจารณาการผ่อน";
  }
  return validateContact(s.form);
}

const trimOrNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** JSON part "data" — ชื่อ field ตรงกับ backend `ServiceRequestDtos.SubmitRequest` */
export function buildSubmitData(s: ServiceRequestState, submissionKey: string, estimatedPrice: number | null) {
  const f = s.form;
  const device = needsDevice(s.services)
    ? {
        deviceType: f.deviceType, model: f.model.trim(), storage: f.storage, color: trimOrNull(f.color),
        region: f.region, battery: f.battery, accessories: f.accessories, warranty: f.warranty,
        body: f.body, screen: f.screen, problems: f.problems, estimatedPrice,
      }
    : null;
  const i = s.installment;
  const installment = s.services.includes("INSTALLMENT")
    ? {
        catalogId: trimOrNull(i.catalogId), productName: i.productName.trim(), color: trimOrNull(i.color),
        storage: trimOrNull(i.storage), conditionLabel: trimOrNull(i.conditionLabel), serialOrSku: trimOrNull(i.serialOrSku),
        price: i.price ?? null, planLabel: trimOrNull(i.planLabel), downPayment: i.downPayment ?? null,
        months: i.months ?? null, monthly: i.monthly ?? null, note: trimOrNull(i.note),
      }
    : null;
  return {
    submissionKey,
    services: s.services,
    contact: {
      name: f.name.trim(), tel: f.tel.trim(),
      subdistrict: trimOrNull(f.subdistrict), district: trimOrNull(f.district), province: trimOrNull(f.province),
      zipcode: f.zipcode.trim(),
    },
    device,
    installment,
    // ตำแหน่งรูป เรียงตรงกับ part "photos" — อยู่ใน JSON (ไม่แยก form field ต่อรูป: Tomcat จำกัดจำนวน part)
    photoSlots: needsDevice(s.services) ? s.photos.map((p) => p.slot) : [],
    consent: s.services.includes("INSTALLMENT") ? s.consent : false,
  };
}

/**
 * multipart body — ส่งเฉพาะไฟล์ของบริการที่เลือก (ติ๊กออกแล้วรูป/บัตรค้างใน state ก็ไม่ถูกส่ง)
 * part ทั้งหมด = data 1 + รูป ≤ 10 + บัตร ≤ 1 (server ตั้ง max-part-count 20)
 */
export function buildSubmitFormData(s: ServiceRequestState, submissionKey: string, estimatedPrice: number | null): FormData {
  const fd = new FormData();
  fd.append("data", new Blob([JSON.stringify(buildSubmitData(s, submissionKey, estimatedPrice))], { type: "application/json" }));
  if (needsDevice(s.services)) {
    for (const p of s.photos) fd.append("photos", p.file, p.file.name);
  }
  if (s.services.includes("INSTALLMENT") && s.idCard) fd.append("idCard", s.idCard, s.idCard.name);
  return fd;
}

export interface SubmitResult {
  refCode: string;
  tradeInId: number | null;
  installmentId: number | null;
  photoCount: number;
  idCardAttached: boolean;
  duplicate: boolean;
}

/** บรรทัดเครื่องที่จะผ่อน */
export function installmentLines(i: InstallmentInterest): string[] {
  return [
    `รุ่น: ${i.productName.trim()}`,
    i.color ? `สี: ${i.color}` : null,
    i.storage ? `ความจุ: ${i.storage}` : null,
    i.conditionLabel ? `สภาพ: ${i.conditionLabel}` : null,
    i.serialOrSku ? `รหัส: ${i.serialOrSku}` : null,
    i.price != null ? `ราคาเครื่อง: ${baht(i.price)}` : null,
    i.planLabel ? `แผน: ${i.planLabel}` : null,
    i.downPayment != null ? `เงินดาวน์: ${baht(i.downPayment)}` : null,
    i.monthly != null && i.months ? `ผ่อน: ${baht(i.monthly)} x ${i.months} เดือน` : null,
    i.note?.trim() ? `หมายเหตุ: ${i.note.trim()}` : null,
  ].filter((l): l is string => !!l);
}

/**
 * ข้อความ LINE หลังบันทึกสำเร็จ — เลขอ้างอิงจาก server ให้แอดมินเปิดดูรูป/บัตรในหลังบ้าน
 * (ไม่ใส่ข้อมูลในบัตรประชาชนลงแชท)
 */
export function buildServiceMessage(s: ServiceRequestState, res: SubmitResult, estimatedPrice: number | null): string {
  const names = s.services.map((c) => SERVICES[c].label).join(" + ");
  const lines: (string | null)[] = [
    `📋 ขอใช้บริการ: ${names}`,
    `อ้างอิง: ${res.refCode}`,
  ];
  if (needsDevice(s.services)) {
    lines.push("", "— ข้อมูลเครื่องของฉัน —", ...deviceLines(s.form));
    if (res.photoCount > 0) lines.push(`📷 แนบรูปเครื่องผ่านเว็บแล้ว ${res.photoCount} รูป`);
    if (estimatedPrice != null) lines.push(`ราคาประเมินเบื้องต้น (จากเว็บ): ${baht(estimatedPrice)}`);
  }
  if (s.services.includes("INSTALLMENT")) {
    lines.push("", "— เครื่องที่ต้องการผ่อน —", ...installmentLines(s.installment));
    if (res.idCardAttached) lines.push("🪪 แนบบัตรประชาชนผ่านเว็บแล้ว");
  }
  lines.push("", ...contactLines(s.form));
  return lines.filter((l) => l != null).join("\n");
}

/** UUID ต่อ "ความตั้งใจส่ง 1 ครั้ง" — กันกดซ้ำ/เน็ตหลุดแล้วสร้างคำขอซ้ำ */
export function newSubmissionKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
