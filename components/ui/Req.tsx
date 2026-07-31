/**
 * ดอกจันสีแดงหน้าช่องที่ "จำเป็นต้องกรอก" — ใช้ให้เหมือนกันทุกฟอร์ม (register/checkout ฯลฯ)
 * แยกจากข้อความ label เพื่อไม่ให้ * ติดสีเทาของ label · aria-hidden เพราะ screen reader อ่าน required จาก input เอง
 */
export default function Req() {
  return <span className="text-error-text" aria-hidden="true"> *</span>;
}
