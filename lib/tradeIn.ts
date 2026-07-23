/**
 * ไอโฟนแลกเงิน (trade-in / รับซื้อ) — config ฟอร์มประเมินสภาพเครื่อง + ตัวสร้างข้อความส่ง LINE
 *
 * หมายเหตุ: การประเมินผ่านเว็บเป็น "เบื้องต้น" — ราคาจริงทีมงานตีให้ทาง LINE (เราไม่คำนวณราคาปลอม)
 * ทุกอย่างเป็น config + pure function เพื่อเทสต์ได้และแก้ตัวเลือกที่เดียว
 */

export type Choice = { value: string; label: string };

/** ประเภทเครื่อง (ร้านเรารับ ไอโฟน/ไอแพด เป็นหลัก) */
export const DEVICE_TYPES: Choice[] = [
  { value: "iphone", label: "iPhone" },
  { value: "ipad", label: "iPad" },
];

/** ความจุ */
export const STORAGES: Choice[] = [
  { value: "64GB", label: "64GB" },
  { value: "128GB", label: "128GB" },
  { value: "256GB", label: "256GB" },
  { value: "512GB", label: "512GB" },
  { value: "1TB", label: "1TB" },
];

/** เวอร์ชันเครื่อง (โซนเครื่อง) */
export const REGIONS: Choice[] = [
  { value: "TH", label: "TH (เครื่องศูนย์ไทย)" },
  { value: "ZP", label: "ZP" },
  { value: "OTHER", label: "รุ่นอื่นๆ" },
];

/** สุขภาพแบตเตอรี่ */
export const BATTERY: Choice[] = [
  { value: "sealed", label: "เครื่องใหม่ ยังไม่แกะ" },
  { value: "90-100", label: "100% - 90%" },
  { value: "80-89", label: "89% - 80%" },
  { value: "75-79", label: "79% - 75%" },
  { value: "lt75", label: "น้อยกว่า 75%" },
];

/** อุปกรณ์เสริมที่มี */
export const ACCESSORIES: Choice[] = [
  { value: "full", label: "มีกล่อง / อุปกรณ์ครบ" },
  { value: "partial", label: "มีกล่อง / อุปกรณ์ไม่ครบ" },
  { value: "none", label: "ไม่มีกล่อง" },
];

/** ประกัน */
export const WARRANTY: Choice[] = [
  { value: "gte4m", label: "มีประกัน 4 เดือนขึ้นไป" },
  { value: "lt4m", label: "ประกันน้อยกว่า 4 เดือน / หมดประกัน" },
];

/** สภาพรอบเครื่อง (บอดี้) */
export const BODY: Choice[] = [
  { value: "none", label: "ไม่มีรอย" },
  { value: "light", label: "มีรอยเห็นได้แต่ไม่ชัด" },
  { value: "heavy", label: "มีรอยมาก ถลอก สีหลุด" },
  { value: "damaged", label: "มีรอยตก แตก งอ" },
];

/** สภาพหน้าจอ */
export const SCREEN: Choice[] = [
  { value: "none", label: "ไม่มีรอย" },
  { value: "hairline", label: "มีรอยบางๆ ขนแมว" },
  { value: "notch", label: "มีรอยสะดุด" },
  { value: "cracked", label: "มีรอยแตกร้าว" },
];

/** ปัญหาตัวเครื่อง (เลือกได้หลายข้อ) — "none" (ไม่มีปัญหา) ตัดกับข้ออื่น */
export const PROBLEMS: Choice[] = [
  { value: "touch", label: "ระบบสัมผัส" },
  { value: "wireless", label: "wifi / Bluetooth / GPS" },
  { value: "vibrate", label: "ระบบสั่น" },
  { value: "call", label: "โทรออก / รับสาย มีปัญหา" },
  { value: "biometric", label: "แสกนนิ้ว / Face Scan" },
  { value: "home", label: "ปุ่ม Home มีปัญหา" },
  { value: "speaker", label: "ลำโพงบน / ล่าง" },
  { value: "camera", label: "กล้องหน้า / หลัง / แฟลช" },
  { value: "sensor", label: "Sensor" },
  { value: "buttons", label: "ปุ่มล็อค / power / volume" },
];
export const PROBLEM_NONE = "none";   // "ไม่มีปัญหา" — พิเศษ ตัดกับข้ออื่น

export interface TradeInForm {
  deviceType: string;
  model: string;
  storage: string;
  color: string;
  region: string;
  battery: string;
  accessories: string;
  warranty: string;
  body: string;
  screen: string;
  problems: string[];          // ค่าใน PROBLEMS หรือ [PROBLEM_NONE]
  name: string;
  tel: string;
  zipcode: string;
}

export const emptyTradeIn = (): TradeInForm => ({
  deviceType: "iphone", model: "", storage: "", color: "",
  region: "", battery: "", accessories: "", warranty: "", body: "", screen: "",
  problems: [], name: "", tel: "", zipcode: "",
});

const labelOf = (list: Choice[], value: string) => list.find((c) => c.value === value)?.label ?? "-";

/** ตรวจว่าฟอร์มกรอกครบพอส่งไหม — คืน error message แรกที่เจอ (null = ผ่าน) */
export function validateTradeIn(f: TradeInForm): string | null {
  if (!f.model.trim()) return "กรุณากรอกรุ่นเครื่อง";
  if (!f.storage) return "กรุณาเลือกความจุ";
  if (!f.region) return "กรุณาเลือกเวอร์ชันเครื่อง (TH/ZP/อื่นๆ)";
  if (!f.battery) return "กรุณาเลือกสุขภาพแบตเตอรี่";
  if (!f.accessories) return "กรุณาเลือกอุปกรณ์เสริมที่มี";
  if (!f.warranty) return "กรุณาเลือกสถานะประกัน";
  if (!f.body) return "กรุณาเลือกสภาพรอบเครื่อง";
  if (!f.screen) return "กรุณาเลือกสภาพหน้าจอ";
  if (f.problems.length === 0) return "กรุณาเลือกปัญหาตัวเครื่อง (ถ้าไม่มีให้เลือก \"ไม่มีปัญหา\")";
  if (!f.name.trim()) return "กรุณากรอกชื่อ-นามสกุล";
  if (!/^0\d{1,2}[-\s]?\d{3}[-\s]?\d{3,4}$/.test(f.tel.trim())) return "กรุณากรอกเบอร์โทรให้ถูกต้อง";
  if (!/^\d{5}$/.test(f.zipcode.trim())) return "กรุณากรอกรหัสไปรษณีย์ 5 หลัก";
  return null;
}

/** สร้างข้อความสรุปส่งเข้า LINE (พิมพ์รอในแชทให้แอดมินตีราคา) */
export function buildTradeInMessage(f: TradeInForm): string {
  const deviceLabel = labelOf(DEVICE_TYPES, f.deviceType);
  const problemText = f.problems.includes(PROBLEM_NONE)
    ? "ไม่มีปัญหา"
    : f.problems.map((p) => labelOf(PROBLEMS, p)).join(", ") || "-";

  return [
    "📱 ขอประเมินราคา “ไอโฟนแลกเงิน”",
    "",
    `ประเภท: ${deviceLabel}`,
    `รุ่น: ${f.model.trim()}`,
    `ความจุ: ${labelOf(STORAGES, f.storage)}`,
    f.color.trim() ? `สี: ${f.color.trim()}` : null,
    `เวอร์ชัน: ${labelOf(REGIONS, f.region)}`,
    `สุขภาพแบต: ${labelOf(BATTERY, f.battery)}`,
    `อุปกรณ์: ${labelOf(ACCESSORIES, f.accessories)}`,
    `ประกัน: ${labelOf(WARRANTY, f.warranty)}`,
    `รอบเครื่อง: ${labelOf(BODY, f.body)}`,
    `หน้าจอ: ${labelOf(SCREEN, f.screen)}`,
    `ปัญหา: ${problemText}`,
    "",
    `ชื่อ: ${f.name.trim()}`,
    `เบอร์: ${f.tel.trim()}`,
    `รหัสไปรษณีย์: ${f.zipcode.trim()}`,
  ].filter(Boolean).join("\n");
}
