import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rapsodoMlm2Pro } from "../src/lib/import/rapsodo";
import { statsByClub, findGaps } from "../src/lib/analytics/shots";
import { normalizeClub } from "../src/lib/import/types";

const fixture = () =>
  readFileSync(join(__dirname, "fixtures", "rapsodo-mlm2pro.csv"), "utf8");

describe("club normalization", () => {
  it("collapses the many spellings devices use", () => {
    expect(normalizeClub("7 Iron")).toBe("7i");
    expect(normalizeClub("I7")).toBe("7i");
    expect(normalizeClub("Driver")).toBe("d");
    expect(normalizeClub("1W")).toBe("d");
    expect(normalizeClub("Pitching Wedge")).toBe("pw");
    expect(normalizeClub("SW")).toBe("sw");
    expect(normalizeClub("4 Hybrid")).toBe("4h");
  });
});

describe("rapsodo adapter", () => {
  it("sniffs its own format", () => {
    expect(rapsodoMlm2Pro.sniff(fixture())).toBe(true);
    expect(rapsodoMlm2Pro.sniff("date,ball speed,carry\n1,2,3")).toBe(false);
  });

  it("reads the session date from the title row", () => {
    const s = rapsodoMlm2Pro.parse(fixture());
    expect(s.date).toBe("2026-06-22");
    expect(s.dateFromFile).toBe(true);
  });

  it("skips repeated headers and the Average / Std. Dev. rows", () => {
    const s = rapsodoMlm2Pro.parse(fixture());
    // 17 pw + 17 7i + 34 driver, and nothing else
    expect(s.shots.length).toBe(68);
    expect(s.shots.some((x) => x.club === "average")).toBe(false);
    expect(s.shots.some((x) => x.club === "std.dev.")).toBe(false);
  });

  it("throws something a human can act on when given the wrong file", () => {
    expect(() => rapsodoMlm2Pro.parse("nonsense,file\n1,2")).toThrow(/Club Type/);
  });
});

describe("shot analytics", () => {
  it("separates spread from standard deviation", () => {
    const { shots } = rapsodoMlm2Pro.parse(fixture());
    const stats = statsByClub(shots);
    const seven = stats.find((s) => s.club === "7i")!;
    expect(seven.n).toBe(17);
    // spread is always at least as wide as one sd either side
    expect(seven.carrySpread!).toBeGreaterThan(seven.carrySd!);
    // reliable carry is a floor, so it sits below the mean
    expect(seven.reliableCarry!).toBeLessThan(seven.carryMean!);
  });

  it("finds the hole between wedge and 7 iron", () => {
    const { shots } = rapsodoMlm2Pro.parse(fixture());
    const gaps = findGaps(statsByClub(shots));
    const pwTo7i = gaps.find((g) => g.from === "7i" && g.to === "pw");
    expect(pwTo7i).toBeDefined();
    expect(pwTo7i!.problem).toBe(true);
  });
});
