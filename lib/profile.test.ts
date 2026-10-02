import { describe, it, expect } from "vitest";
import { addressFromLogin, formatAddress, normalizeAddress, toAddressPayload, toGeo } from "./profile";

const geo = { subdistrict: "คลองเตย", district: "คลองเตย", province: "กรุงเทพมหานคร", zipcode: "10110" };

describe("toAddressPayload", () => {
  it("ไม่เลือกที่อยู่ → null (backend = ไม่มี/ล้างที่อยู่)", () => {
    expect(toAddressPayload(null, "99/1")).toBeNull();
  });
  it("บ้านเลขที่ว่าง → null · มีค่า → trim", () => {
    expect(toAddressPayload(geo, "   ")?.addressLine).toBeNull();
    expect(toAddressPayload(geo, " 99/1 ")).toEqual({ ...geo, addressLine: "99/1" });
  });
});

describe("addressFromLogin", () => {
  it("ไม่มี zipcode ใน response → null", () => {
    expect(addressFromLogin({ token: "t", name: "a" })).toBeNull();
  });
  it("Map แบนจาก login → UserAddress (addressLine หาย = สตริงว่าง)", () => {
    expect(addressFromLogin({ ...geo })).toEqual({ ...geo, addressLine: "" });
  });
});

describe("normalizeAddress / toGeo / formatAddress", () => {
  it("response จาก /users/me → UserAddress", () => {
    expect(normalizeAddress(null)).toBeNull();
    expect(normalizeAddress({ ...geo, addressLine: null })).toEqual({ ...geo, addressLine: "" });
  });
  it("toGeo ตัดบ้านเลขที่ออก · null → null", () => {
    expect(toGeo({ ...geo, addressLine: "99/1" })).toEqual(geo);
    expect(toGeo(null)).toBeNull();
    expect(toGeo(undefined)).toBeNull();
  });
  it("formatAddress ไม่มีบ้านเลขที่ → ไม่มีช่องว่างนำหน้า", () => {
    expect(formatAddress({ ...geo, addressLine: "" })).toBe("ต.คลองเตย อ.คลองเตย จ.กรุงเทพมหานคร 10110");
    expect(formatAddress({ ...geo, addressLine: "99/1" })).toBe("99/1 ต.คลองเตย อ.คลองเตย จ.กรุงเทพมหานคร 10110");
  });
});
