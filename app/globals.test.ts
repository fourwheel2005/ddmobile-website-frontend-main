import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("page wrapper animation", () => {
  it("does not retain a transform that would rebase fixed descendants", () => {
    expect(globalStyles).toMatch(
      /\.page-wrapper\s*\{\s*animation:\s*page-enter 320ms ease;\s*\}/,
    );
    expect(globalStyles).not.toMatch(
      /\.page-wrapper\s*\{[^}]*animation:[^;}]*\bboth\b[^;}]*;/,
    );
  });
});
