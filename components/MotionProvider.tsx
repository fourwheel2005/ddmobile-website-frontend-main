"use client";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * ครอบ framer-motion ทั้งแอปให้เคารพ prefers-reduced-motion อัตโนมัติ
 * (reducedMotion="user" → ปิด animation ของ transform/layout ให้ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว
 *  แต่คง opacity ไว้ — เป็น safety net ครอบ dropdown/grid/modal ที่ไม่ได้เช็ค useReducedMotion เอง)
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
