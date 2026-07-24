import { describe, it, expect } from "vitest";
import {
  parseConsent, buildConsent,
  CONSENT_VERSION, MAX_AGE_DAYS,
} from "./cookieConsent";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000; // เวลาอ้างอิงคงที่ (ไม่พึ่ง Date.now จริง)

function stored(over: Record<string, unknown> = {}): string {
  return JSON.stringify({ v: CONSENT_VERSION, at: NOW, analytics: false, marketing: false, ...over });
}

describe("buildConsent", () => {
  it("ติด version + timestamp ปัจจุบัน และคง choices", () => {
    const r = buildConsent({ analytics: true, marketing: false }, NOW);
    expect(r).toEqual({ v: CONSENT_VERSION, at: NOW, analytics: true, marketing: false });
  });
});

describe("parseConsent — กรณีถูกต้อง", () => {
  it("คืนค่าที่บันทึกเมื่อ version ตรงและยังไม่หมดอายุ", () => {
    const r = parseConsent(stored({ analytics: true, marketing: true }), NOW + DAY);
    expect(r).toEqual({ v: CONSENT_VERSION, at: NOW, analytics: true, marketing: true });
  });

  it("ยังไม่หมดอายุพอดีที่ขอบเขต MAX_AGE_DAYS", () => {
    const r = parseConsent(stored(), NOW + MAX_AGE_DAYS * DAY);
    expect(r).not.toBeNull();
  });
});

describe("parseConsent — ต้องถามใหม่ (คืน null)", () => {
  it("raw ว่าง/null", () => {
    expect(parseConsent(null, NOW)).toBeNull();
    expect(parseConsent("", NOW)).toBeNull();
  });

  it("JSON เสีย", () => {
    expect(parseConsent("{not json", NOW)).toBeNull();
  });

  it("ไม่ใช่ object", () => {
    expect(parseConsent("42", NOW)).toBeNull();
    expect(parseConsent("null", NOW)).toBeNull();
  });

  it("version คนละเวอร์ชัน (นโยบายเปลี่ยน)", () => {
    expect(parseConsent(stored({ v: CONSENT_VERSION + 1 }), NOW)).toBeNull();
  });

  it("หมดอายุ (เกิน MAX_AGE_DAYS)", () => {
    expect(parseConsent(stored(), NOW + MAX_AGE_DAYS * DAY + 1)).toBeNull();
  });

  it("at ไม่ใช่ตัวเลข", () => {
    expect(parseConsent(stored({ at: "yesterday" }), NOW)).toBeNull();
  });

  it("field ความยินยอมไม่ใช่ boolean", () => {
    expect(parseConsent(stored({ analytics: "yes" }), NOW)).toBeNull();
    expect(parseConsent(stored({ marketing: 1 }), NOW)).toBeNull();
  });
});
