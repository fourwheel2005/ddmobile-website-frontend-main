import { describe, expect, it } from "vitest";
import { originalQuote, type InstallmentInfo } from "./InstallmentBox";

const info: InstallmentInfo = {
  kind: "MODEL", downPayment: 0, terms: [], note: null,
  plans: [{ label: null, down: 0, promo: "โปร 11.11", terms: [{ months: 10, monthly: 2690 }] }],
  promoName: "โปร 11.11", promoEndsAt: null,
  originalPlans: [{ label: null, down: 3990, promo: null, terms: [{ months: 10, monthly: 2890 }, { months: 12, monthly: 2590, down: 4990 }] }],
};

describe("originalQuote (FIX-217)", () => {
  it("finds the normal down and monthly of the same term", () => {
    expect(originalQuote(info, 0, 10)).toEqual({ down: 3990, monthly: 2890 });
    expect(originalQuote(info, 0, 12)).toEqual({ down: 4990, monthly: 2590 });
  });

  it("returns null without a promo or a matching term", () => {
    expect(originalQuote({ ...info, promoName: null }, 0, 10)).toBeNull();
    expect(originalQuote(info, 0, 24)).toBeNull();
    expect(originalQuote(info, 0, undefined)).toBeNull();
  });
});
