import { describe, expect, it } from "vitest";
import { hasAdminAccess, homeForRole } from "./roles";

describe("hasAdminAccess", () => {
  it("แอดมินเข้าได้เสมอ", () => {
    expect(hasAdminAccess("ROLE_ADMIN", true)).toBe(true);
    expect(hasAdminAccess("ROLE_ADMIN", false)).toBe(true);
  });
  it("พนักงานเข้าได้เมื่อเปิดโหมดเท่าแอดมิน", () => {
    expect(hasAdminAccess("ROLE_EMPLOYEE", true)).toBe(true);
    expect(hasAdminAccess("ROLE_EMPLOYEE", false)).toBe(false);
  });
  it("ลูกค้า/ไม่มี role เข้าไม่ได้", () => {
    expect(hasAdminAccess("ROLE_CUSTOMER", true)).toBe(false);
    expect(hasAdminAccess(undefined, true)).toBe(false);
    expect(hasAdminAccess(null, true)).toBe(false);
  });
});

describe("homeForRole", () => {
  it("พาไปหน้าที่ถูก", () => {
    expect(homeForRole("ROLE_ADMIN", true)).toBe("/admin");
    expect(homeForRole("ROLE_EMPLOYEE", true)).toBe("/admin");
    expect(homeForRole("ROLE_EMPLOYEE", false)).toBe("/employee");
    expect(homeForRole("ROLE_CUSTOMER", true)).toBe("/products");
    expect(homeForRole(undefined, true)).toBe("/products");
  });
});
