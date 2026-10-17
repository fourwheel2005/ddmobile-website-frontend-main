/**
 * สิทธิ์หลังบ้านฝั่งหน้าเว็บ — ซ่อน/โชว์เมนูเท่านั้น (backend ตัดสินสิทธิ์จริงจาก DB เสมอ)
 *
 * พนักงาน (ROLE_EMPLOYEE) ได้สิทธิ์เท่าแอดมิน — คู่กับ backend app.staff.employee-full-admin (EMPLOYEE_FULL_ADMIN)
 * NEXT_PUBLIC_EMPLOYEE_FULL_ADMIN=off → กลับไปแบบเดิม: พนักงานใช้หน้า /employee ตามสิทธิ์ที่มอบ (ดู docs/rollback/employee-full-admin.md)
 */
export const EMPLOYEE_FULL_ADMIN = process.env.NEXT_PUBLIC_EMPLOYEE_FULL_ADMIN !== "off";

/** เข้าหน้าแอดมิน (/admin) ได้ไหม */
export function hasAdminAccess(role: string | null | undefined, employeeFullAdmin = EMPLOYEE_FULL_ADMIN): boolean {
  return role === "ROLE_ADMIN" || (employeeFullAdmin && role === "ROLE_EMPLOYEE");
}

/** หน้าแรกหลังล็อกอินของแต่ละ role */
export function homeForRole(role: string | null | undefined, employeeFullAdmin = EMPLOYEE_FULL_ADMIN): string {
  if (hasAdminAccess(role, employeeFullAdmin)) return "/admin";
  if (role === "ROLE_EMPLOYEE") return "/employee";
  return "/products";
}
