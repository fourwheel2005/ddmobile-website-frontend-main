/**
 * เกณฑ์เกรดสภาพเครื่องมือสอง (S13/UX-03) — reference content ของร้าน (เหมือนกันทุกเครื่อง)
 * ไม่ใช่ข้อมูลตรวจรายเครื่อง · ใช้อธิบายว่า "เกรด X" ที่ Stock ส่งมาแปลว่าอะไร
 */
export const GRADE_LEGEND: Record<string, string> = {
  A: "สภาพดีมาก ตำหนิน้อยมากหรือแทบมองไม่เห็น",
  B: "สภาพดี มีร่องรอยการใช้งานทั่วไปเล็กน้อย",
  C: "มีตำหนิเห็นได้ชัด แต่ใช้งานได้ปกติ",
  D: "สภาพมีตำหนิมาก เน้นใช้งานเป็นหลัก",
};

/** คำอธิบายเกรด (normalize ตัวพิมพ์ใหญ่) — null ถ้าไม่รู้จักเกรดนี้ (ไม่เดา) */
export function gradeDescription(grade: string | null | undefined): string | null {
  if (!grade) return null;
  return GRADE_LEGEND[grade.trim().toUpperCase()] ?? null;
}
