import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

import FloatingActions from "./FloatingActions";

describe("FloatingActions", () => {
  beforeEach(() => {
    route.pathname = "/";
  });

  it("keeps floating controls off mobile layouts", () => {
    const markup = renderToStaticMarkup(<FloatingActions />);

    expect(markup).toContain("hidden");
    expect(markup).toContain("md:flex");
    expect(markup).not.toContain("bottom-[184px]");
    expect(markup).not.toContain("bottom-[76px]");
  });

  it("does not render in admin pages", () => {
    route.pathname = "/admin/products";

    expect(renderToStaticMarkup(<FloatingActions />)).toBe("");
  });
});
