import { describe, expect, it } from "vitest";
import { countdownParts, hasOffer, isoToLocalInput, localInputToIso, resolveLink, toSlug, withDefaults } from "./campaign";
import { LINE_URL, TEL_HREF } from "./contact";
import { menuFromSearch } from "./adminMenu";

describe("resolveLink — ปลายทางปุ่มหน้า Landing", () => {
  it("LINE: ข้อความที่พิมพ์รอไว้ + ชื่อหน้า (แอดมินรู้ว่ามาจากแอดไหน)", () => {
    const r = resolveLink({ type: "LINE", value: "สนใจผ่อน iPhone 16" }, "โปรพฤศจิกา")!;
    expect(r.external).toBe(true);
    expect(r.href.startsWith(LINE_URL + "?")).toBe(true);
    expect(decodeURIComponent(r.href.split("?")[1])).toBe("สนใจผ่อน iPhone 16\n(จากหน้า: โปรพฤศจิกา)\n");
  });
  it("LINE ไม่มีข้อความและไม่มีชื่อหน้า → ห้องแชทเปล่า", () => {
    expect(resolveLink({ type: "LINE", value: null })!.href).toBe(LINE_URL);
  });
  it("PHONE: ว่าง = เบอร์ร้าน · มีเบอร์ = tel: ตัวเลขล้วน", () => {
    expect(resolveLink({ type: "PHONE", value: null })!.href).toBe(TEL_HREF);
    expect(resolveLink({ type: "PHONE", value: "088-818-8385" })!.href).toBe("tel:0888188385");
  });
  it("PATH: หน้าในเว็บเท่านั้น · กัน //โดเมนอื่น และ javascript:", () => {
    expect(resolveLink({ type: "PATH", value: "/services?s=INSTALLMENT" })).toEqual({ href: "/services?s=INSTALLMENT", external: false });
    expect(resolveLink({ type: "PATH", value: "//evil.com" })).toBeNull();
    expect(resolveLink({ type: "PATH", value: "javascript:alert(1)" })).toBeNull();
    expect(resolveLink({ type: "PATH", value: "/\\evil.com" })).toBeNull();   // เบราว์เซอร์อ่าน /\ เป็น //
    expect(resolveLink({ type: "PATH", value: "/a b" })).toBeNull();
  });
  it("URL: https เท่านั้น", () => {
    expect(resolveLink({ type: "URL", value: "https://m.me/ddmobile" })).toEqual({ href: "https://m.me/ddmobile", external: true });
    expect(resolveLink({ type: "URL", value: "http://shop.com" })).toBeNull();
    expect(resolveLink({ type: "URL", value: "javascript:alert(1)" })).toBeNull();
    expect(resolveLink(null)).toBeNull();
  });
});

describe("countdownParts — นับถอยหลังโปร", () => {
  const now = Date.parse("2026-11-13T10:00:00+07:00");
  it("เหลือ 1 วัน 2 ชม. 3 นาที 4 วินาที", () => {
    expect(countdownParts("2026-11-14T12:03:04+07:00", now)).toEqual({ d: 1, h: 2, m: 3, s: 4 });
  });
  it("หมดเวลา / ไม่มีวันที่ / วันที่มั่ว → null (ซ่อน ไม่โชว์ 00:00 หลอก)", () => {
    expect(countdownParts("2026-11-13T10:00:00+07:00", now)).toBeNull();
    expect(countdownParts(null, now)).toBeNull();
    expect(countdownParts("พรุ่งนี้", now)).toBeNull();
  });
});

describe("เวลาไทยในช่อง datetime-local ↔ ISO", () => {
  it("กรอก 30/11 23:59 (ไทย) → เก็บ +07:00 · แสดงกลับตรงเดิม", () => {
    expect(localInputToIso("2026-11-30T23:59")).toBe("2026-11-30T23:59:00+07:00");
    expect(isoToLocalInput("2026-11-30T23:59:00+07:00")).toBe("2026-11-30T23:59");
    expect(isoToLocalInput("2026-11-30T16:59Z")).toBe("2026-11-30T23:59");   // backend อาจคืนเป็น UTC
  });
  it("ว่าง/รูปแบบผิด", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("30/11/2026")).toBeNull();
    expect(isoToLocalInput(null)).toBe("");
  });
});

describe("ตัวช่วยอื่น", () => {
  it("toSlug: อังกฤษ/ตัวเลขเท่านั้น คั่นด้วยขีด · ไทยตัดทิ้ง", () => {
    expect(toSlug("iPhone 16 Pro — Nov!")).toBe("iphone-16-pro-nov");
    expect(toSlug("โปรผ่อนไอโฟน")).toBe("");
  });
  it("hasOffer: ไม่มีราคาและหมายเหตุ = ไม่แสดงกล่องราคา", () => {
    expect(hasOffer({ label: "ผ่อนเริ่มต้น", priceBefore: null, price: null, priceSuffix: "/เดือน", note: null, countdownEnd: null, countdownLabel: null })).toBe(false);
    expect(hasOffer({ label: null, priceBefore: null, price: "990.-", priceSuffix: null, note: null, countdownEnd: null, countdownLabel: null })).toBe(true);
  });
  it("withDefaults: เนื้อหาขาด field ไม่ทำหน้าพัง", () => {
    const c = withDefaults({ services: { title: "x", items: undefined as never } });
    expect(c.ctas).toEqual([]);
    expect(c.services!.items).toEqual([]);
    expect(c.hero).toBeNull();
  });
  it("เมนูหลังบ้าน ?menu=landing-pages", () => {
    expect(menuFromSearch("?menu=landing-pages")).toBe("หน้า Landing ยิงแอด");
  });
});

describe("isLandingPath — หน้า Landing ไม่มีเมนูเว็บ", () => {
  it("เฉพาะ /p/…", async () => {
    const { isLandingPath } = await import("./campaign");
    expect(isLandingPath("/p/iphone16-nov")).toBe(true);
    expect(isLandingPath("/products")).toBe(false);
    expect(isLandingPath("/p")).toBe(false);
    expect(isLandingPath(null)).toBe(false);
  });
});

describe("loadPublicCampaign — ไม่พบ vs ระบบล่ม", () => {
  const realFetch = globalThis.fetch;
  const withFetch = async (impl: typeof fetch, run: () => Promise<void>) => {
    globalThis.fetch = impl;
    try { await run(); } finally { globalThis.fetch = realFetch; }
  };
  it("404 → null (หน้าไม่พบ) · slug ตัวใหญ่ถูกแปลงเป็นตัวเล็กก่อนขอ · แคช 30 วิ", async () => {
    const { loadPublicCampaign } = await import("./campaign");
    const calls: { url: string; init?: RequestInit }[] = [];
    await withFetch((async (url: string, init?: RequestInit) => { calls.push({ url, init }); return new Response("{}", { status: 404 }); }) as unknown as typeof fetch, async () => {
      expect(await loadPublicCampaign("iPhone16-Nov")).toBeNull();
    });
    expect(calls[0].url.endsWith("/campaign-pages/iphone16-nov")).toBe(true);
    expect(calls[0].init?.next?.revalidate).toBe(30);
  });
  it("5xx/429 → throw (ให้ error.tsx แสดง ลองใหม่/ทักไลน์ ไม่ใช่ 404)", async () => {
    const { loadPublicCampaign } = await import("./campaign");
    await withFetch((async () => new Response("", { status: 429 })) as unknown as typeof fetch, async () => {
      await expect(loadPublicCampaign("promo")).rejects.toThrow();
    });
  });
  it("slug ผิดรูป/% เสีย → null โดยไม่ยิงเครือข่าย", async () => {
    const { loadPublicCampaign } = await import("./campaign");
    let called = false;
    await withFetch((async () => { called = true; return new Response("{}"); }) as unknown as typeof fetch, async () => {
      expect(await loadPublicCampaign("%E0%A4")).toBeNull();
      expect(await loadPublicCampaign("../admin")).toBeNull();
    });
    expect(called).toBe(false);
  });
});
