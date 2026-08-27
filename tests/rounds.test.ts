import { describe, it, expect } from "vitest";
import { toSummary } from "../src/lib/db";
import type { Round } from "@prisma/client";

const round = (o: Partial<Round>): Round =>
  ({
    id: "r", userId: "single", playedAt: new Date(), course: null,
    holes: 9, par: 36, score: 45, gir: 3, fairways: null,
    penalties: 1, doubles: 1, threePutts: 1, putts: null,
    notes: null, source: "manual", createdAt: new Date(), ...o,
  }) as Round;

describe("per-nine normalization", () => {
  it("leaves a nine-hole round alone", () => {
    expect(toSummary(round({}))!.scorePer9).toBe(45);
  });

  it("halves an eighteen so it doesn't distort a trend built from nines", () => {
    const s = toSummary(round({ holes: 18, par: 72, score: 92, gir: 6, penalties: 3, doubles: 4, threePutts: 2 }))!;
    expect(s.scorePer9).toBe(46);
    expect(s.girPer9).toBe(3);
    expect(s.doublesPer9).toBe(2);
  });

  it("drops a round with unrecorded stats rather than scoring the blanks as zero", () => {
    expect(toSummary(round({ gir: null }))).toBeNull();
    expect(toSummary(round({ threePutts: null }))).toBeNull();
  });

  it("keeps a genuine zero", () => {
    expect(toSummary(round({ penalties: 0 }))!.penaltiesPer9).toBe(0);
  });
});
