import { describe, expect, it } from "vitest";
import { initialProductOption } from "./productOption";

const options = [
  { variantId: "mist", color: "Mist Blue", storage: "256GB" },
  { variantId: "silver", color: "Silver", storage: "256GB" },
];

describe("initialProductOption", () => {
  it("selects the exact variant requested by a device QR redirect", () => {
    expect(initialProductOption(options, "silver")?.color).toBe("Silver");
  });

  it("keeps the original first-option behavior for normal product links", () => {
    expect(initialProductOption(options, null)?.color).toBe("Mist Blue");
  });

  it("falls back safely when an obsolete variant id is scanned", () => {
    expect(initialProductOption(options, "removed")?.variantId).toBe("mist");
  });
});
