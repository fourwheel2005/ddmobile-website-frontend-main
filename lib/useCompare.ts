"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * รายการ "เปรียบเทียบสินค้า" (S13/UX-03)
 *
 * - เก็บใน sessionStorage (ไม่ต้อง login, หายเมื่อปิดแท็บ — เป็นการเลือกชั่วคราวเพื่อตัดสินใจ)
 * - จำกัด 2–3 รายการ (MAX=3) ตามสเปก — เกินแล้ว toggle ตัวใหม่จะถูกปฏิเสธ
 * - ใช้ useSyncExternalStore: subscribe ผ่าน custom event (ในแท็บ) + storage event (ข้ามแท็บ)
 *   getSnapshot คืน reference เดิมถ้าค่าไม่เปลี่ยน (กัน re-render วน)
 */
export const COMPARE_MAX = 3;
const KEY = "dd-compare";
const EVT = "dd-compare-change";

const EMPTY: string[] = [];
let cachedRaw: string | null = null;
let cachedArr: string[] = EMPTY;

function parse(raw: string | null): string[] {
  try {
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

/** คืน array เดิม (identity เดิม) ถ้า raw string ไม่เปลี่ยน — จำเป็นสำหรับ useSyncExternalStore */
function getSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedArr;
  cachedRaw = raw;
  cachedArr = parse(raw);
  return cachedArr;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

/**
 * ตรรกะ toggle ล้วน (แยกให้ทดสอบได้โดยไม่พึ่ง storage/DOM)
 * มีอยู่แล้ว → ถอดออก (ok) · ยังไม่มีและไม่เต็ม → เพิ่ม (ok) · เต็มแล้ว → ปฏิเสธ (ok=false, คงเดิม)
 */
export function applyToggle(cur: string[], id: string): { ids: string[]; ok: boolean } {
  if (cur.includes(id)) return { ids: cur.filter((x) => x !== id), ok: true };
  if (cur.length >= COMPARE_MAX) return { ids: cur, ok: false };
  return { ids: [...cur, id], ok: true };
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

function write(ids: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* โหมดไม่ให้เขียน storage — ข้ามไป (ฟีเจอร์เสริม ไม่ควรทำหน้าพัง) */
  }
  window.dispatchEvent(new Event(EVT));
}

export function useCompare() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const isFull = ids.length >= COMPARE_MAX;

  /** เพิ่ม/ถอดออก · คืน false ถ้าเพิ่มไม่ได้เพราะเต็ม (ให้ผู้เรียกแจ้งเตือน) */
  const toggle = useCallback((id: string): boolean => {
    const { ids: next, ok } = applyToggle(getSnapshot(), id);
    if (ok) write(next);
    return ok;
  }, []);

  const remove = useCallback((id: string) => write(getSnapshot().filter((x) => x !== id)), []);
  const clear = useCallback(() => write([]), []);

  return { ids, count: ids.length, has, isFull, toggle, remove, clear };
}
