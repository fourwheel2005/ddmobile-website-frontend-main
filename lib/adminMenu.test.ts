import { describe, expect, it } from "vitest";
import { menuFromSearch } from "./adminMenu";

describe("menuFromSearch — ลิงก์จากการ์ด LINE เข้าเมนูหลังบ้าน", () => {
  it("slug ที่รู้จัก → ชื่อเมนู", () => {
    expect(menuFromSearch("?menu=installments")).toBe("คำขอผ่อนสินค้า");
    expect(menuFromSearch("?menu=trade-in&x=1")).toBe("คำขอขาย/บอลลูน");
  });
  it("ไม่มี / ไม่รู้จัก / ชื่อ property ของ object → null", () => {
    expect(menuFromSearch("")).toBeNull();
    expect(menuFromSearch("?menu=")).toBeNull();
    expect(menuFromSearch("?menu=orders")).toBeNull();
    expect(menuFromSearch("?menu=constructor")).toBeNull();
    expect(menuFromSearch("?menu=__proto__")).toBeNull();
  });
});
