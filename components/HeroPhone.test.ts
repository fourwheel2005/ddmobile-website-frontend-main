import { describe, expect, it } from "vitest";

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
