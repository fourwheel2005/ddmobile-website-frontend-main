import { afterEach, describe, expect, it } from "vitest";
import { confirmLeave, hasUnsavedWork, setUnsaved, trackUpload } from "./unsavedGuard";

afterEach(() => setUnsaved(false));

describe("unsavedGuard — กันงานหายตอนออกจากหน้าแก้", () => {
  it("ไม่มีงานค้าง → ไปต่อได้ทันที (ไม่ถาม)", async () => {
    let asked = 0;
    setUnsaved(false, async () => { asked++; return false; });
    expect(await confirmLeave()).toBe(true);
    expect(asked).toBe(0);
  });

  it("ยังไม่บันทึก + ยกเลิก → อยู่ต่อ และยังถูกกันอยู่ (ไม่ล้างสถานะ)", async () => {
    setUnsaved(true, async () => false);
    expect(await confirmLeave()).toBe(false);
    expect(hasUnsavedWork()).toBe(true);
  });

  it("ยืนยันออก → beforeunload ไม่ถามซ้ำ · หน้าลงทะเบียนใหม่ = กันใหม่", async () => {
    setUnsaved(true, async () => true);
    expect(await confirmLeave()).toBe(true);
    expect(hasUnsavedWork()).toBe(false);
    setUnsaved(true, async () => true);
    expect(hasUnsavedWork()).toBe(true);
  });

  it("ระหว่างอัปโหลด = มีงานค้าง · อัปเสร็จ/ล้ม = ไม่ค้าง", async () => {
    let finish!: () => void;
    const task = trackUpload(new Promise<void>((r) => { finish = r; }));
    expect(hasUnsavedWork()).toBe(true);
    finish();
    await task;
    expect(hasUnsavedWork()).toBe(false);
    await trackUpload(Promise.reject(new Error("x"))).catch(() => {});
    expect(hasUnsavedWork()).toBe(false);
  });
});
