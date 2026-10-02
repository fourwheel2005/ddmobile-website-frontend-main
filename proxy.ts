import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, gate, membersWallEnabled } from "@/lib/accessGate";

/**
 * กำแพงสมาชิก (Next 16 proxy — ชื่อใหม่ของ middleware) — ตัดสินก่อน render ทุกหน้า
 * ไม่ได้ล็อกอิน → /login?redirect=<หน้าเดิม> · ข้อมูลไม่ครบ → /profile?complete=1&redirect=<หน้าเดิม>
 * กติกาทั้งหมดอยู่ที่ lib/accessGate.ts · ปิดฉุกเฉิน: NEXT_PUBLIC_MEMBERS_WALL=off (docs/rollback/members-wall.md)
 */
const WALL_ENABLED = membersWallEnabled(process.env.NEXT_PUBLIC_MEMBERS_WALL);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const decision = gate(pathname, search, request.cookies.get(SESSION_COOKIE)?.value, WALL_ENABLED);
  if (decision.type === "allow") return NextResponse.next();
  return NextResponse.redirect(new URL(decision.location, request.url));
}

// ข้ามไฟล์ระบบ/ไฟล์คงที่ (มีนามสกุล เช่น .png .html) และ API — ตรวจเฉพาะ "หน้าเว็บ"
export const config = {
  matcher: ["/((?!_next/|api/|.*\\.[A-Za-z0-9]+$).*)"],
};
