import { describe, it, expect } from "vitest";
import * as db from "thai-address-database";
import { buildAddressIndex, searchAddress } from "./thaiAddress";

// index จากฐานข้อมูลจริง — วิธีเดียวกับที่ component ใช้
const index = buildAddressIndex(db.searchAddressByProvince(".", Number.MAX_SAFE_INTEGER));

describe("buildAddressIndex", () => {
  it("ได้ทุกแถวของฐานข้อมูล (lib ตัด 20 แถวถ้าไม่ส่ง maxResult) + ตัดแถวซ้ำ", () => {
    expect(index.length).toBeGreaterThan(7000);
    const keys = new Set(index.map((r) => `${r.subdistrict}|${r.district}|${r.province}|${r.zipcode}`));
    expect(keys.size).toBe(index.length);
  });
  it("zipcode เป็น string 5 หลักเสมอ", () => {
    expect(index.every((r) => /^\d{5}$/.test(r.zipcode))).toBe(true);
  });
});

describe("searchAddress", () => {
  it("ค้นด้วยจังหวัดได้ครบเกิน 20 (lib เดิมตัดที่ 20)", () => {
    const all = searchAddress(index, "กรุงเทพ", 1000);
    expect(all.length).toBeGreaterThan(150);
    expect(all.every((r) => r.province.includes("กรุงเทพ"))).toBe(true);
  });
  it("รหัสไปรษณีย์ = prefix (พิมพ์ 10 ไม่เอา 81100 มาปน) · ตรงเป๊ะมาก่อน", () => {
    const r = searchAddress(index, "10", 1000);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.zipcode.startsWith("10"))).toBe(true);
    const exact = searchAddress(index, "10500");
    expect(exact[0].zipcode).toBe("10500");
    expect(exact.some((x) => x.subdistrict === "บางรัก")).toBe(true);
  });
  it("หลายคำ — ทุกคำต้อง match (ตำบล + จังหวัด / ตำบล + zip)", () => {
    const r = searchAddress(index, "บางรัก กรุงเทพ");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.province.includes("กรุงเทพ"))).toBe(true);
    expect(searchAddress(index, "บางรัก 10500").every((x) => x.zipcode === "10500")).toBe(true);
  });
  it("ขึ้นต้นด้วยคำค้น มาก่อน มีอยู่ข้างใน", () => {
    const r = searchAddress(index, "บาง", 1000);
    const firstContains = r.findIndex((x) => ![x.subdistrict, x.district, x.province].some((f) => f.startsWith("บาง")));
    if (firstContains >= 0) {
      expect(r.slice(firstContains).every((x) => ![x.subdistrict, x.district, x.province].some((f) => f.startsWith("บาง")))).toBe(true);
    }
  });
  it("อักขระพิเศษ regex ไม่ทำให้พัง/ไม่ match ทุกแถว", () => {
    expect(searchAddress(index, "((")).toEqual([]);
    expect(searchAddress(index, "..")).toEqual([]);
  });
  it("สั้นกว่า 2 ตัว / ว่าง → [] · เคารพ limit", () => {
    expect(searchAddress(index, "ก")).toEqual([]);
    expect(searchAddress(index, "   ")).toEqual([]);
    expect(searchAddress(index, "บาง", 5)).toHaveLength(5);
  });
});
