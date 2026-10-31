import { describe, expect, it } from "vitest";
import { ACCOUNT_HELP_MESSAGE, passwordProblem, tokenFromHash } from "./passwordReset";

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCd"; // 42 ตัว base64url

describe("tokenFromHash — อ่าน token จากลิงก์ในอีเมล (#token=…)", () => {
  it("อ่านได้ทั้งมีและไม่มี #", () => {
    expect(tokenFromHash(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash(`token=${TOKEN}`)).toBe(TOKEN);
  });
  it("ค่าว่าง/สั้น/มีตัวอักษรแปลก → null (ไม่ยิงไปถาม backend)", () => {
    expect(tokenFromHash(null)).toBeNull();
    expect(tokenFromHash("")).toBeNull();
    expect(tokenFromHash("#token=abc")).toBeNull();
    expect(tokenFromHash(`#token=${TOKEN}<script>`)).toBeNull();
    expect(tokenFromHash(`#other=${TOKEN}`)).toBeNull();
  });
});

describe("passwordProblem — กติการหัสใหม่ (ตรงกับ backend)", () => {
  it("ผ่าน: 8 ตัวขึ้นไป และสองช่องตรงกัน", () => {
    expect(passwordProblem("abcdefgh", "abcdefgh")).toBeNull();
    expect(passwordProblem("รหัสไทย8ตัว", "รหัสไทย8ตัว")).toBeNull();
  });
  it("ว่าง/ช่องว่างล้วน", () => {
    expect(passwordProblem("", "")).toMatch(/กรุณากรอก/);
    expect(passwordProblem("        ", "        ")).toMatch(/กรุณากรอก/);
  });
  it("สั้นกว่า 8 ตัว", () => {
    expect(passwordProblem("1234567", "1234567")).toMatch(/อย่างน้อย 8/);
  });
  it("ยาวเกิน 72 ไบต์ (ภาษาไทย 1 ตัว = 3 ไบต์)", () => {
    expect(passwordProblem("a".repeat(72), "a".repeat(72))).toBeNull();
    expect(passwordProblem("a".repeat(73), "a".repeat(73))).toMatch(/ยาวเกินไป/);
    expect(passwordProblem("ก".repeat(25), "ก".repeat(25))).toMatch(/ยาวเกินไป/);
  });
  it("สองช่องไม่ตรงกัน", () => {
    expect(passwordProblem("abcdefgh", "abcdefgx")).toMatch(/ไม่ตรงกัน/);
  });
});

describe("ACCOUNT_HELP_MESSAGE — backend แยกเรื่อง \"ช่วยเหลือบัญชี\" ได้", () => {
  it("ขึ้นต้นด้วย สวัสดี และมีคำว่า ลืมรหัสผ่าน", () => {
    expect(ACCOUNT_HELP_MESSAGE.startsWith("สวัสดี")).toBe(true);
    expect(ACCOUNT_HELP_MESSAGE).toContain("ลืมรหัสผ่าน");
    expect(ACCOUNT_HELP_MESSAGE).not.toContain("\n");
  });
});
