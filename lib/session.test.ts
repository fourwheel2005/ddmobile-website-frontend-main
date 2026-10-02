import { describe, it, expect } from "vitest";
import { isProfileComplete, sessionCookie, sessionState } from "./session";
import type { StoredUser } from "./profile";

const full: StoredUser = {
  name: "สมชาย", email: "a@x.com", role: "ROLE_CUSTOMER", tel: "081-234-5678",
  address: { addressLine: "99/1 ถ.สุขุมวิท", subdistrict: "คลองเตย", district: "คลองเตย", province: "กรุงเทพมหานคร", zipcode: "10110" },
};

describe("isProfileComplete — ชื่อ + เบอร์ + ที่อยู่ครบ", () => {
  it("ครบ → true", () => expect(isProfileComplete(full)).toBe(true));
  it("ขาดอย่างใดอย่างหนึ่ง → false (รวมบ้านเลขที่ว่าง / เบอร์ผิดรูป / ผู้ใช้เก่าที่ยังไม่ sync ที่อยู่)", () => {
    expect(isProfileComplete({ ...full, name: " " })).toBe(false);
    expect(isProfileComplete({ ...full, tel: "123" })).toBe(false);
    expect(isProfileComplete({ ...full, address: null })).toBe(false);
    expect(isProfileComplete({ ...full, address: undefined })).toBe(false);
    expect(isProfileComplete({ ...full, address: { ...full.address!, addressLine: "" } })).toBe(false);
    expect(isProfileComplete({ ...full, address: { ...full.address!, zipcode: "101" } })).toBe(false);
    expect(isProfileComplete(null)).toBe(false);
  });
  it("แอดมิน/พนักงานได้รับยกเว้น (บัญชีพนักงานไม่มีที่อยู่ลูกค้า)", () => {
    expect(isProfileComplete({ email: "admin@x.com", role: "ROLE_ADMIN" })).toBe(true);
    expect(isProfileComplete({ email: "e@x.com", role: "ROLE_EMPLOYEE" })).toBe(true);
    expect(sessionState({ email: "c@x.com", role: "ROLE_CUSTOMER" })).toBe("i");
  });
});

describe("sessionCookie", () => {
  it("ตั้งค่า: ทั้งเว็บ, SameSite=Lax, อายุ 14 วัน, Secure บน https", () => {
    expect(sessionCookie("c", true)).toBe("dd_session=c; Path=/; SameSite=Lax; Max-Age=1209600; Secure");
    expect(sessionCookie("i", false)).toBe("dd_session=i; Path=/; SameSite=Lax; Max-Age=1209600");
  });
  it("ลบ: Max-Age=0", () => {
    expect(sessionCookie(null, true)).toBe("dd_session=; Path=/; SameSite=Lax; Max-Age=0; Secure");
  });
});
