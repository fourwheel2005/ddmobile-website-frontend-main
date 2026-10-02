/**
 * โปรไฟล์ลูกค้า (ชื่อ/เบอร์/ที่อยู่) — แหล่งจริงอยู่ที่ DB (GET/PUT /users/me)
 * สำเนาเก็บใน localStorage "user" (key เดียวกับที่หน้า login/Navbar ใช้) ไว้ prefill ฟอร์ม
 * โดยไม่ต้องยิง API ทุกครั้งที่เปิดหน้า checkout / ขายเครื่อง / ผ่อนบอลลูน
 *
 * address ใน localStorage:  undefined = session เก่าก่อนมีฟีเจอร์ที่อยู่ (ยังไม่ sync → ดึง /users/me 1 ครั้ง)
 *                          null      = sync แล้ว ผู้ใช้ไม่มีที่อยู่
 */
import api from "@/lib/api";
import { writeSessionCookie } from "@/lib/session";
import type { ThaiGeo } from "@/lib/thaiAddress";

export interface UserAddress extends ThaiGeo {
  addressLine: string;   // บ้านเลขที่/หมู่/ซอย/ถนน ("" = ไม่ได้กรอก)
}

export interface StoredUser {
  name?: string;
  email?: string;
  role?: string;
  tel?: string;
  address?: UserAddress | null;
}

/** รูปแบบที่ backend คืน (ProfileResponse) */
export interface ProfileResponse {
  name: string | null;
  email: string;
  tel: string | null;
  address: { addressLine: string | null; subdistrict: string; district: string; province: string; zipcode: string } | null;
}

/** body ของ PUT /users/me และ address ตอนสมัคร (ชื่อ field ตรงกับ AddressDto ฝั่ง backend) */
export function toAddressPayload(geo: ThaiGeo | null, addressLine: string) {
  if (!geo) return null;
  return {
    addressLine: addressLine.trim() || null,
    subdistrict: geo.subdistrict,
    district: geo.district,
    province: geo.province,
    zipcode: geo.zipcode,
  };
}

export function normalizeAddress(a: ProfileResponse["address"] | undefined): UserAddress | null {
  if (!a || !a.zipcode) return null;
  return { addressLine: a.addressLine ?? "", subdistrict: a.subdistrict, district: a.district, province: a.province, zipcode: a.zipcode };
}

/** response ของ /auth/login (Map แบน ๆ — ไม่มี key ที่อยู่ = ไม่มีที่อยู่) */
export function addressFromLogin(d: Record<string, unknown>): UserAddress | null {
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  if (!s("zipcode")) return null;
  return { addressLine: s("addressLine"), subdistrict: s("subdistrict"), district: s("district"), province: s("province"), zipcode: s("zipcode") };
}

export function toGeo(a: UserAddress | null | undefined): ThaiGeo | null {
  return a ? { subdistrict: a.subdistrict, district: a.district, province: a.province, zipcode: a.zipcode } : null;
}

/** ที่อยู่บรรทัดเดียว เช่น "99/1 ถ.สุขุมวิท ต.คลองเตย อ.คลองเตย จ.กรุงเทพมหานคร 10110" */
export function formatAddress(a: UserAddress): string {
  return [a.addressLine.trim(), `ต.${a.subdistrict} อ.${a.district} จ.${a.province} ${a.zipcode}`].filter(Boolean).join(" ");
}

export function readStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/** merge ลง localStorage + แจ้ง Navbar (event "storage" ไม่ยิงใน tab เดียวกันเอง) */
export function patchStoredUser(patch: Partial<StoredUser>): StoredUser | null {
  const prev = readStoredUser();
  if (!prev) return null;   // ไม่ได้ล็อกอิน → ไม่สร้าง user ขึ้นมาเอง
  const next = { ...prev, ...patch };
  try {
    localStorage.setItem("user", JSON.stringify(next));
    writeSessionCookie(next);   // ข้อมูลครบ/ไม่ครบเปลี่ยน → กำแพงต้องรู้ทันที
    window.dispatchEvent(new Event("storage"));
  } catch { /* storage เต็ม/ถูกบล็อก → ใช้ค่าในหน่วยความจำต่อ */ }
  return next;
}

// single-flight — หลาย component ขอพร้อมกันยิง /users/me ครั้งเดียว
let syncing: Promise<StoredUser | null> | null = null;

/**
 * ข้อมูลไว้ prefill ฟอร์ม — คืนจาก localStorage ทันที (0 request)
 * ยกเว้น session เก่าที่ยังไม่เคย sync ที่อยู่ → ดึง /users/me ครั้งเดียวแล้วเก็บ (ครั้งต่อไปไม่ยิงอีก)
 */
export function loadPrefill(): Promise<StoredUser | null> {
  const u = readStoredUser();
  if (!u) return Promise.resolve(null);
  if (u.address !== undefined) return Promise.resolve(u);
  syncing ??= api.get<ProfileResponse>("/users/me")
    .then((r) => patchStoredUser({
      name: r.data.name ?? u.name,
      tel: r.data.tel ?? u.tel,
      address: normalizeAddress(r.data.address),
    }))
    .catch(() => u)   // ดึงไม่ได้ → ใช้ที่มี (prefill เป็นของเสริม ห้ามทำให้ฟอร์มพัง)
    .finally(() => { syncing = null; });
  return syncing;
}
