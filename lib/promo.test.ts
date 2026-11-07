import { describe, expect, it } from "vitest";
import { stockPromo } from "./promo";

describe("stockPromo (FIX-217)", () => {
  it("cash cut shows the original price struck through", () => {
    const p = stockPromo(30900, 32900, "โปร 11.11", "2026-11-11T16:59:00Z");
    expect(p).toEqual({ name: "โปร 11.11", label: "โปรพิเศษ -฿2,000", priceBefore: 32900, priceAfter: 30900, endAt: "2026-11-11T16:59:00Z" });
  });

  it("installment-only promo keeps the badge without a struck price", () => {
    const p = stockPromo(32900, 32900, "ดาวน์ 0", null);
    expect(p?.label).toBe("โปรพิเศษ");
    expect(p?.priceBefore).toBeNull();
  });

  it("no promo name means no promo", () => {
    expect(stockPromo(30900, 32900, null, null)).toBeNull();
    expect(stockPromo(null, 32900, "x", null)).toBeNull();
  });
});
