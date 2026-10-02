/**
 * บริการของร้าน — แหล่งเดียวของ "ชื่อที่ลูกค้าเห็น" + หน้า + code ที่ส่ง backend
 * (เดิมชื่อ "ไอโฟนแลกเงิน" hardcode กระจาย ~10 ที่ → เปลี่ยนชื่อทีต้องไล่แก้ทุกไฟล์)
 *
 * code ต้องตรงกับ backend `ServiceType` (SELL | INSTALLMENT | BALLOON)
 */
export type ServiceCode = "SELL" | "INSTALLMENT" | "BALLOON";

export interface ServiceMeta {
  code: ServiceCode;
  /** ชื่อเต็ม — หัวข้อหน้า/ฟอร์ม/ข้อความ LINE */
  label: string;
  /** ชื่อสั้นสำหรับเมนู (พื้นที่จำกัด) */
  navLabel: string;
  /** อธิบายสั้น ๆ ใต้ชื่อ (ช่องเลือกบริการ) */
  desc: string;
  href: string;
}

export const SERVICES: Record<ServiceCode, ServiceMeta> = {
  SELL: {
    code: "SELL",
    label: "ขายเครื่อง",
    navLabel: "ขายเครื่อง",
    desc: "ขาย iPhone / iPad รับเงินสด — แนบรูปเครื่องให้ประเมิน",
    href: "/sell",
  },
  INSTALLMENT: {
    code: "INSTALLMENT",
    label: "ผ่อนเครื่อง",
    navLabel: "ผ่อนเครื่อง",
    desc: "ผ่อน iPhone / iPad ใช้บัตรประชาชนใบเดียว",
    href: "/services?s=INSTALLMENT",
  },
  BALLOON: {
    code: "BALLOON",
    label: "ผ่อนบอลลูน (บริการแลกเงิน)",
    navLabel: "ผ่อนบอลลูน (แลกเงิน)",
    desc: "นำเครื่องมาแลกเงินสด แล้วผ่อนใช้เครื่องเดิมต่อ",
    href: "/trade-in",
  },
};

/** ลำดับแสดงในช่องเลือกบริการ */
export const SERVICE_ORDER: ServiceCode[] = ["SELL", "INSTALLMENT", "BALLOON"];

export const isServiceCode = (v: string): v is ServiceCode => v in SERVICES;

/**
 * อ่านบริการที่เลือกไว้ล่วงหน้าจาก query (?s=SELL,INSTALLMENT) — ค่ามั่วถูกทิ้ง
 * ขายเครื่อง + ผ่อนบอลลูน เลือกพร้อมกันไม่ได้ (เครื่องเดียวกันขายขาดและแลกเงินพร้อมกันไม่ได้) → เก็บตัวแรก
 */
export function parseServices(raw: string | null | undefined, fallback: ServiceCode[] = []): ServiceCode[] {
  const picked = (raw ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(isServiceCode);
  const out: ServiceCode[] = [];
  for (const s of picked) {
    if (out.includes(s)) continue;
    if ((s === "SELL" && out.includes("BALLOON")) || (s === "BALLOON" && out.includes("SELL"))) continue;
    out.push(s);
  }
  return out.length ? out : fallback;
}

/**
 * ติ๊ก/เอาติ๊กออก 1 บริการ — ติ๊กขายเครื่องจะเอาผ่อนบอลลูนออกให้ (และกลับกัน)
 * คงลำดับตาม SERVICE_ORDER เสมอ (ข้อความ/ส่วนฟอร์มเรียงคงที่)
 */
export function toggleService(current: ServiceCode[], code: ServiceCode): ServiceCode[] {
  if (current.includes(code)) return current.filter((c) => c !== code);
  const exclusive: ServiceCode | null = code === "SELL" ? "BALLOON" : code === "BALLOON" ? "SELL" : null;
  const next = [...current.filter((c) => c !== exclusive), code];
  return SERVICE_ORDER.filter((c) => next.includes(c));
}

/** บริการที่ต้องกรอกข้อมูลเครื่องของลูกค้า (รุ่น/สภาพ) */
export const needsDevice = (s: ServiceCode[]) => s.includes("SELL") || s.includes("BALLOON");
