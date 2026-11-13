/**
 * กันงานหายตอนออกจากหน้าแก้ในหลังบ้าน — หน้าที่มีฟอร์มยาว (เช่น แก้หน้า Landing) ลงทะเบียนว่ายังไม่บันทึก
 * เมนูหลังบ้าน/ปุ่มออกจากระบบถาม confirmLeave() ก่อนไปต่อ (ปิดแท็บ/รีเฟรช ใช้ beforeunload ของหน้านั้นเอง)
 * นับ "งานอัปโหลดที่ยังวิ่งอยู่" ด้วย — ออกกลางคันไฟล์ขึ้นเซิร์ฟเวอร์แต่ไม่ถูกใส่ในหน้า
 *
 * สถานะ "ยังไม่บันทึก" ล้างโดยหน้าที่ลงทะเบียนเอง (บันทึกสำเร็จ/ถูกถอดออก) ไม่ล้างที่นี่
 * — กดเมนูเดิมแล้วยืนยัน หน้ายังอยู่ ต้องยังถูกกันต่อ
 */
let dirty = false;
let ask: (() => Promise<boolean>) | null = null;
let uploads = 0;
/** ผู้ใช้ยืนยันออกแล้ว (เช่น ออกจากระบบ → เปลี่ยนหน้า) — beforeunload ไม่ต้องถามซ้ำ */
let confirmed = false;

export function setUnsaved(isDirty: boolean, confirm?: () => Promise<boolean>) {
  dirty = isDirty;
  ask = isDirty ? confirm ?? null : null;
  confirmed = false;
}

export function hasUnsavedWork(): boolean {
  return !confirmed && (dirty || uploads > 0);
}

/** ห่อการอัปโหลด — ระหว่างนี้ถือว่ามีงานค้าง */
export async function trackUpload<T>(task: Promise<T>): Promise<T> {
  uploads++;
  try {
    return await task;
  } finally {
    uploads--;
  }
}

/** true = ไปต่อได้ (ไม่มีงานค้าง หรือผู้ใช้ยืนยันทิ้ง) */
export async function confirmLeave(): Promise<boolean> {
  if (!hasUnsavedWork()) return true;
  let ok: boolean;
  if (dirty && ask) {
    ok = await ask();
  } else {
    const { confirmDialog } = await import("@/components/ui/confirmDialog");
    ok = await confirmDialog({ title: "กำลังอัปโหลดไฟล์อยู่", message: "ออกตอนนี้ไฟล์ที่กำลังอัปจะไม่ถูกใส่ในหน้า", confirmText: "ออกเลย", danger: true });
  }
  if (ok) confirmed = true;
  return ok;
}
