import { describe, expect, it, vi } from "vitest";

import { resolveHeroPhoneView } from "./HeroPhone";

describe("resolveHeroPhoneView", () => {
  it("switches to the front view after a deliberate left swipe", () => {
    expect(resolveHeroPhoneView("back", -42, 0)).toBe("front");
  });

  it("switches to the back view after a deliberate right swipe", () => {
    expect(resolveHeroPhoneView("front", 42, 0)).toBe("back");
  });

  it("uses velocity for a fast short swipe", () => {
    expect(resolveHeroPhoneView("back", -10, -420)).toBe("front");
    expect(resolveHeroPhoneView("front", 10, 420)).toBe("back");
  });

  it("keeps the current view for an accidental short drag", () => {
    expect(resolveHeroPhoneView("front", 41, 419)).toBe("front");
    expect(resolveHeroPhoneView("back", -41, -419)).toBe("back");
  });
});

describe("claimHeroIntro (เล่น motion เปิดตัวครั้งแรกของแท็บเท่านั้น)", () => {
  const memoryStorage = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };
  // flag ระดับโมดูล → โหลดโมดูลใหม่ทุกเคส เพื่อจำลอง "เปิดหน้าใหม่"
  const load = async () => {
    vi.resetModules();
    return import("./HeroPhone");
  };

  it("เปิดครั้งแรกได้เล่น แล้วจดไว้ใน sessionStorage", async () => {
    const { claimHeroIntro, HERO_INTRO_STORAGE_KEY } = await load();
    const storage = memoryStorage();
    expect(claimHeroIntro(storage)).toBe(true);
    expect(storage.getItem(HERO_INTRO_STORAGE_KEY)).toBe("1");
  });

  it("กลับมาหน้าแรกซ้ำในเอกสารเดิม (client navigation) ไม่เล่นซ้ำ", async () => {
    const { claimHeroIntro } = await load();
    expect(claimHeroIntro(memoryStorage())).toBe(true);
    expect(claimHeroIntro(memoryStorage())).toBe(false);
  });

  it("รีเฟรชในแท็บเดิม (storage จดไว้แล้ว) ไม่เล่นซ้ำ", async () => {
    const { claimHeroIntro, HERO_INTRO_STORAGE_KEY } = await load();
    const storage = memoryStorage();
    storage.setItem(HERO_INTRO_STORAGE_KEY, "1");
    expect(claimHeroIntro(storage)).toBe(false);
  });

  it("storage ใช้ไม่ได้ (private mode) → ยังเล่นได้ครั้งเดียวต่อการโหลดหน้า ไม่ throw", async () => {
    const { claimHeroIntro } = await load();
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(claimHeroIntro(broken)).toBe(true);
    expect(claimHeroIntro(broken)).toBe(false);
  });

  it("ไม่มี storage เลย → เล่นได้ครั้งเดียว", async () => {
    const { claimHeroIntro } = await load();
    expect(claimHeroIntro(null)).toBe(true);
    expect(claimHeroIntro(null)).toBe(false);
  });

  it("ความยาว intro อยู่ในช่วง 5–6 วินาทีตามที่กำหนด", async () => {
    const { HERO_INTRO_SECONDS } = await load();
    expect(HERO_INTRO_SECONDS).toBeGreaterThanOrEqual(5);
    expect(HERO_INTRO_SECONDS).toBeLessThanOrEqual(6);
  });
});
