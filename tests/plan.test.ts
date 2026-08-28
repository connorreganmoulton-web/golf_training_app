import { describe, it, expect } from "vitest";
import { buildPlan, MIN_ROUNDS, type RoundSummary } from "../src/lib/plan/engine";

const rounds = (o: Partial<RoundSummary>): RoundSummary[] =>
  Array.from({ length: MIN_ROUNDS }, () => ({
    scorePer9: 45, girPer9: 3.5, penaltiesPer9: 1, doublesPer9: 1, threePuttsPer9: 1, ...o,
  }));

const reasonFor = (rs: RoundSummary[], id: string) =>
  buildPlan(rs).blocks.find((b) => b.block.id === id)!.reason;

describe("a boosted block says only what its numbers support", () => {
  // penalties gap 2.0 (sim, driver), three putts gap 1.0 (lag, sink)
  const twoDeficits = rounds({ penaltiesPer9: 3, threePuttsPer9: 2 });

  it("claims no rank when two categories share the boost", () => {
    expect(reasonFor(twoDeficits, "driver")).toBe("Your penalty strokes are among the most costly");
    expect(reasonFor(twoDeficits, "lag")).toBe("Your three putts are among the most costly");
  });

  it("names both when one block answers both deficits", () => {
    // penalties and doubles both remedy "sim"; 2.0 strokes against 1.0
    const r = rounds({ penaltiesPer9: 3, doublesPer9: 1.5 });
    expect(reasonFor(r, "sim")).toBe("Your penalty strokes and your doubles or worse are among the most costly");
  });

  it("says the superlative only when one category is boosted alone", () => {
    const r = rounds({ penaltiesPer9: 3 });
    expect(reasonFor(r, "sim")).toBe("Your penalty strokes are costing you the most");
  });

  it("leaves untouched blocks on the baseline reason", () => {
    expect(reasonFor(twoDeficits, "wedge")).toBe("Baseline allocation");
  });
});

describe("no superlative comes from the sort order", () => {
  // These assert the whole payload — rationale, every block with its slot
  // count and reason, every caveat. A negative "must not say second furthest"
  // passes any reworded version of the same invented ranking, and an unpinned
  // caveat or slot count is somewhere for one to come back.
  const payload = (rs: RoundSummary[]) => {
    const p = buildPlan(rs);
    return [
      p.rationale,
      ...p.blocks.map((b) => `${b.block.id} x${b.slots}: ${b.reason}`),
      ...p.caveats,
    ];
  };
  const built = `Built from your last ${MIN_ROUNDS} rounds.`;
  const boosted = "are among the most costly, so the blocks that address them got an extra slot this week.";
  const WEIGHTING =
    "Categories are ranked by what they cost, not by which number is biggest — a double is worth about two three putts, a penalty stroke about one, and a green missed about three quarters of one. The largest number on your card is not always the one that got the extra time.";
  const STANDARD = [
    WEIGHTING,
    "Nine-hole samples are small. One blow-up hole can move a category for weeks.",
    "This reweights practice time. It cannot tell you whether a category moved because you improved or because the course was easier.",
  ];
  const level = (name: string, winners: string) =>
    `Baseline allocation — your ${name} cost about as much as ${winners}, which got the extra time this week`;
  const tie = (all: string, picked: string) =>
    `${all} cost about the same, to within a rounding error. Nothing separates them, so it gave the extra time to ${picked} on a general ordering of what usually costs a mid-handicap most, not on anything in your game.`;

  it("ranks neither side of a tie for first", () => {
    expect(payload(rounds({ penaltiesPer9: 2, threePuttsPer9: 2 }))).toEqual([
      `${built} Your penalty strokes and your three putts ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the most costly",
      "strike x2: Baseline allocation",
      "lowpoint x2: Baseline allocation",
      "sim x2: Your penalty strokes are among the most costly",
      "sink x4: Your three putts are among the most costly",
      "lag x3: Your three putts are among the most costly",
      ...STANDARD,
    ]);
  });

  it("names the category that ties its way out, and the block it lost to", () => {
    // doubles and three putts are level at 1.0 stroke; doubles keeps the slot
    // on strokes gained (#35), so three putts must not read as unflagged
    expect(payload(rounds({ penaltiesPer9: 3, doublesPer9: 1.5, threePuttsPer9: 2 }))).toEqual([
      `${built} Your penalty strokes and your doubles or worse ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the most costly",
      "strike x2: Baseline allocation",
      "lowpoint x3: Your doubles or worse are among the most costly",
      "sim x2: Your penalty strokes and your doubles or worse are among the most costly",
      `sink x3: ${level("three putts", "your doubles or worse")}`,
      `lag x2: ${level("three putts", "your doubles or worse")}`,
      tie("Your doubles or worse and your three putts", "your doubles or worse"),
      ...STANDARD,
    ]);
  });

  const W4 = "your greens hit and your doubles or worse";

  it("owns up to both picks when the whole top of the list is level", () => {
    // all four categories at 0.75 strokes: neither boost was earned over the
    // other. Every value here is exact in binary, so the four gaps are too.
    expect(payload(rounds({ girPer9: 2.5, penaltiesPer9: 1.75, doublesPer9: 1.375, threePuttsPer9: 1.75 }))).toEqual([
      `${built} Your greens hit and your doubles or worse ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x3: Your greens hit are among the most costly",
      `driver x1: ${level("penalty strokes", W4)}`,
      "strike x3: Your greens hit are among the most costly",
      "lowpoint x3: Your doubles or worse are among the most costly",
      "sim x2: Your doubles or worse are among the most costly",
      `sink x3: ${level("three putts", W4)}`,
      `lag x2: ${level("three putts", W4)}`,
      tie(
        "Your greens hit, your doubles or worse, your penalty strokes and your three putts",
        W4,
      ),
      ...STANDARD,
    ]);
  });

  it("owns up to both picks when three are level and two win", () => {
    const W3 = "your doubles or worse and your penalty strokes";
    expect(payload(rounds({ penaltiesPer9: 2, doublesPer9: 1.5, threePuttsPer9: 2 }))).toEqual([
      `${built} Your doubles or worse and your penalty strokes ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the most costly",
      "strike x2: Baseline allocation",
      "lowpoint x3: Your doubles or worse are among the most costly",
      "sim x2: Your doubles or worse and your penalty strokes are among the most costly",
      `sink x3: ${level("three putts", W3)}`,
      `lag x2: ${level("three putts", W3)}`,
      tie("Your doubles or worse, your penalty strokes and your three putts", W3),
      ...STANDARD,
    ]);
  });

  it("counts a tie the last bit disagrees about", () => {
    // 1.5 greens under target at 0.75 strokes each, against penalties
    // averaging 2.125: both 1.125 strokes from target in arithmetic, 4e-16
    // apart in floating point. An === tie check drops greens hit from the
    // payload entirely and this is the case that catches it.
    const near: RoundSummary[] = [2.3, 2.0, 2.1, 2.2, 2.05, 2.1].map((p) => ({
      scorePer9: 45, girPer9: 2, doublesPer9: 3, threePuttsPer9: 1,
      penaltiesPer9: p,
    }));
    expect(payload(near)).toContain(
      tie("Your greens hit and your penalty strokes", "your greens hit"),
    );
    expect(payload(near)).toContain(`driver x1: ${level("penalty strokes", "your greens hit")}`);
  });

  it("says nothing about a tie when a third deficit is genuinely behind", () => {
    // gaps 2.0 / 1.0 / 0.995 strokes. Close enough that a widened tolerance
    // would call them level; distinct enough that they are not. Two categories
    // the app can actually separate must not get the tie caveat or the level
    // note.
    expect(payload(rounds({ penaltiesPer9: 3, doublesPer9: 1.5, threePuttsPer9: 1.995 }))).toEqual([
      `${built} Your penalty strokes and your doubles or worse ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the most costly",
      "strike x2: Baseline allocation",
      "lowpoint x3: Your doubles or worse are among the most costly",
      "sim x2: Your penalty strokes and your doubles or worse are among the most costly",
      "sink x3: Baseline allocation",
      "lag x2: Baseline allocation",
      ...STANDARD,
    ]);
  });

  it("ranks neither even when the two are clearly separated", () => {
    // three putts 1.0 strokes, greens hit 0.56 — a real gap, and still no
    // ordering is claimed, because a two-item list read as a ranking is what
    // started this
    expect(payload(rounds({ girPer9: 2.75, threePuttsPer9: 2 }))).toEqual([
      `${built} Your three putts and your greens hit ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x3: Your greens hit are among the most costly",
      "driver x1: Baseline allocation",
      "strike x3: Your greens hit are among the most costly",
      "lowpoint x2: Baseline allocation",
      "sim x1: Baseline allocation",
      "sink x4: Your three putts are among the most costly",
      "lag x3: Your three putts are among the most costly",
      ...STANDARD,
    ]);
  });
});

describe("a tie is broken by strokes gained, not by declaration order", () => {
  // #35: `deficits` is declared gir, penalties, doubles, three putts, and a
  // stable sort left that literal deciding who got a slot when gaps were
  // equal. The fallback is now docs/BENCHMARKS.md — approach, then doubles,
  // then penalties, then putting — so every case here is one where the two
  // orders disagree.
  const boostedIds = (rs: RoundSummary[]) =>
    buildPlan(rs)
      .blocks.filter((b) => b.slots > b.block.baseSlots)
      .map((b) => b.block.id);

  it("gives the contested slot to doubles over penalties", () => {
    // gir 1.5 strokes clear of both; penalties and doubles level at 0.4, so
    // exactly one slot is contested. Declaration order picks penalties
    // (driver); strokes gained picks doubles (lowpoint).
    const r = rounds({ girPer9: 1.5, penaltiesPer9: 1.4, doublesPer9: 1.2 });
    expect(boostedIds(r)).toEqual(["wedge", "strike", "lowpoint", "sim"]);
  });

  it("gives the contested slot to approach over penalties", () => {
    // greens hit and penalties are a few ulps apart — arithmetically the same
    // cost, which is not the same distance from target: 1.5 greens under at
    // 0.75 each against 1.125 penalties over at 1.0 each. Declaration order
    // happens to hand it to penalties.
    const near: RoundSummary[] = [2.3, 2.0, 2.1, 2.2, 2.05, 2.1].map((p) => ({
      scorePer9: 45, girPer9: 2, doublesPer9: 3, threePuttsPer9: 1,
      penaltiesPer9: p,
    }));
    expect(boostedIds(near)).toEqual(["wedge", "strike", "lowpoint", "sim"]);
  });

  it("names the winner first when the whole tie is boosted", () => {
    // #35's own case: penalties, doubles and three putts all 1.0 stroke over.
    expect(buildPlan(rounds({ penaltiesPer9: 2, doublesPer9: 1.5, threePuttsPer9: 2 })).rationale).toContain(
      "Your doubles or worse and your penalty strokes are among the most costly",
    );
  });

  it("never lets priority outrank a real gap", () => {
    // penalties 2.0, doubles 1.0. Doubles outranks penalties on strokes
    // gained and must still lose to the bigger number.
    expect(buildPlan(rounds({ penaltiesPer9: 3, doublesPer9: 1.5 })).rationale).toContain(
      "Your penalty strokes and your doubles or worse are among the most costly",
    );
  });

  it("says what broke the tie without dressing it up as a finding about the user", () => {
    // The ordering is a claim about golfers in general and the copy has to say
    // so. Citing research here would be the same invented authority #4 removed.
    const caveats = buildPlan(rounds({ penaltiesPer9: 3, doublesPer9: 1.5, threePuttsPer9: 2 })).caveats;
    expect(caveats).toContain(
      "Your doubles or worse and your three putts cost about the same, to within a rounding error. Nothing separates them, so it gave the extra time to your doubles or worse on a general ordering of what usually costs a mid-handicap most, not on anything in your game.",
    );
    expect(caveats.join(" ")).not.toMatch(/research|study|studies|proven/i);
  });
});

describe("categories are scored in a shared unit", () => {
  // #40: gaps used to be a fraction of each target, so greens hit — the only
  // higher-is-better metric, and the only target that isn't 1.0 — could never
  // score above 1.0, while the other three ran unbounded. One unit over target
  // already scored 1.0, so any category worse than that beat approach however
  // badly the player was striking it.
  const boostedIds = (rs: RoundSummary[]) =>
    buildPlan(rs)
      .blocks.filter((b) => b.slots > b.block.baseSlots)
      .map((b) => b.block.id);

  // The issue's headline case, at 3.3 doubles and 2.2 penalties per nine. Note
  // that scoring in strokes does not flip every profile in this bracket: at 2
  // greens approach comes third here, behind penalties by 0.075 strokes. What
  // the fix removes is the ceiling, not the competition — approach can now win
  // on the numbers where before it arithmetically could not.
  const highHandicap = (girPer9: number): RoundSummary[] =>
    Array.from({ length: 8 }, () => ({
      scorePer9: 49, girPer9, penaltiesPer9: 2.2, doublesPer9: 3.3, threePuttsPer9: 2,
    }));

  it("boosts approach for a player hitting no greens at all", () => {
    expect(boostedIds(highHandicap(0))).toContain("strike");
    expect(boostedIds(highHandicap(0))).toContain("wedge");
  });

  it("pins the noise floor from both sides", () => {
    // A quarter stroke per nine is the line. Nothing else in the suite fails
    // if the floor is lowered, so a category sitting just under it has to be
    // asserted directly or NOISE is free to drift down to zero.
    expect(buildPlan(rounds({ threePuttsPer9: 1.2 })).personalized).toBe(false);
    expect(buildPlan(rounds({ threePuttsPer9: 1.35 })).personalized).toBe(true);
  });

  it("still separates zero greens from nearly-target greens", () => {
    // Both used to produce the same plan for different reasons: 3 greens fell
    // under the old noise floor, and 0 greens qualified but lost. In strokes
    // they are 2.25 apart and only the worse one earns the boost.
    expect(boostedIds(highHandicap(0))).not.toEqual(boostedIds(highHandicap(3)));
  });
});
