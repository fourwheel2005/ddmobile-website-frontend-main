import { describe, expect, it, vi } from "vitest";

import {
  DUO_FRAMES, VIEW_FRAME, frameAfterDrag, frameSrc, loadOrder, nearestLoaded, nearestView, pickFrameSize, settleView, stepView,
} from "./HeroPhone";

describe("ท่าของเครื่อง (ด้านหลัง · พับ · กาง)", () => {
  it("เฟรมหลัก: หลัง = 0 · พับ = 53 · กาง = เฟรมสุดท้าย", () => {
    expect(VIEW_FRAME).toEqual({ back: 0, folded: 53, open: DUO_FRAMES - 1 });
  });

  it("หาท่าที่ใกล้ที่สุด", () => {
    expect(nearestView(0)).toBe("back");
    expect(nearestView(26)).toBe("back");
    expect(nearestView(27)).toBe("folded");
    expect(nearestView(70)).toBe("folded");
    expect(nearestView(72)).toBe("open");
    expect(nearestView(89)).toBe("open");
  });

  it("ปุ่มลูกศร: เดินทีละท่า สุดทางแล้วอยู่ที่เดิม", () => {
    expect(stepView("back", 1)).toBe("folded");
    expect(stepView("folded", 1)).toBe("open");
    expect(stepView("open", 1)).toBe("open");
    expect(stepView("open", -1)).toBe("folded");
    expect(stepView("back", -1)).toBe("back");
  });
});

describe("ลากหมุน", () => {
  it("ลากซ้าย = เดินหน้า (หมุนเข้าจอ/กาง) · ลากขวา = ถอยไปด้านหลัง", () => {
    expect(frameAfterDrag(0, -230, 460)).toBeCloseTo(32);
    expect(frameAfterDrag(89, 230, 460)).toBeCloseTo(57);
  });

  it("ไม่ลากเกินต้น/ท้ายเรื่อง และไม่พังเมื่อยังไม่รู้ความกว้างเวที", () => {
    expect(frameAfterDrag(10, 5000, 460)).toBe(0);
    expect(frameAfterDrag(80, -5000, 460)).toBe(DUO_FRAMES - 1);
    expect(frameAfterDrag(40, -100, 0)).toBe(40);
  });

  it("ปล่อยช้า ๆ → เข้าท่าที่ใกล้สุด", () => {
    expect(settleView(20, 0)).toBe("back");
    expect(settleView(48, 100)).toBe("folded");
    expect(settleView(80, -100)).toBe("open");
  });

  it("สะบัดเร็ว → ไปท่าถัดไปตามทิศ (จากท่าที่เพิ่งผ่าน)", () => {
    expect(settleView(5, -420)).toBe("folded");    // เพิ่งออกจากด้านหลัง สะบัดซ้าย → พับ
    expect(settleView(58, -500)).toBe("open");
    expect(settleView(84, 500)).toBe("folded");    // จากกาง สะบัดขวา → พับ
    expect(settleView(48, 500)).toBe("back");
  });

  it("สะบัดสวนทางกับที่เพิ่งลากมา → กลับเข้าท่าที่ใกล้สุด ไม่ข้ามท่า", () => {
    expect(settleView(50, -500)).toBe("folded");   // ยังไม่ถึงพับ สะบัดซ้าย → แค่เข้าพับ
    expect(settleView(3, 500)).toBe("back");
  });
});

describe("โหลดเฟรม", () => {
  it("ท่าหลักโหลดก่อน และครบทุกเฟรมไม่ซ้ำ", () => {
    const o = loadOrder();
    expect(o.slice(0, 3)).toEqual([89, 0, 53]);
    expect(new Set(o).size).toBe(DUO_FRAMES);
    expect(Math.min(...o)).toBe(0);
    expect(Math.max(...o)).toBe(DUO_FRAMES - 1);
  });

  it("เฟรมยังโหลดไม่ถึง → ใช้เฟรมที่โหลดแล้วซึ่งใกล้สุด", () => {
    const loaded = Array(DUO_FRAMES).fill(false);
    expect(nearestLoaded(40, loaded)).toBeNull();
    loaded[32] = true; loaded[53] = true;
    expect(nearestLoaded(40, loaded)).toBe(32);
    expect(nearestLoaded(47.6, loaded)).toBe(53);
    loaded[40] = true;
    expect(nearestLoaded(40.2, loaded)).toBe(40);
  });

  it("เลือกชุดภาพตามพิกเซลจริงบนจอ", () => {
    expect(pickFrameSize(358 * 2, false)).toBe(800);    // มือถือ 390px (DPR ถูกจำกัดที่ 2)
    expect(pickFrameSize(500 * 2, false)).toBe(1100);   // จอคอม retina
    expect(pickFrameSize(500, false)).toBe(640);        // จอคอม DPR 1
    expect(pickFrameSize(1000, true)).toBe(640);        // ประหยัดเน็ต
  });

  it("path ของเฟรม", () => {
    expect(frameSrc(7, 1100)).toBe("/images/hero-duo/1100/f07.webp");
    expect(frameSrc(89, 640)).toBe("/images/hero-duo/640/f89.webp");
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
