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
    expect(reasonFor(twoDeficits, "driver")).toBe("Your penalty strokes are among the furthest from target");
    expect(reasonFor(twoDeficits, "lag")).toBe("Your three putts are among the furthest from target");
  });

  it("names both when one block answers both deficits", () => {
    // penalties and doubles both remedy "sim"
    const r = rounds({ penaltiesPer9: 3, doublesPer9: 2 });
    expect(reasonFor(r, "sim")).toBe("Your penalty strokes and your doubles or worse are among the furthest from target");
  });

  it("says the furthest only when one category is boosted alone", () => {
    const r = rounds({ penaltiesPer9: 3 });
    expect(reasonFor(r, "sim")).toBe("Your penalty strokes are the furthest from target");
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
  const boosted = "are among the furthest from target, so the blocks that address them got an extra slot this week.";
  const STANDARD = [
    "Nine-hole samples are small. One blow-up hole can move a category for weeks.",
    "This reweights practice time. It cannot tell you whether a category moved because you improved or because the course was easier.",
  ];
  const level = (name: string, winners: string) =>
    `Baseline allocation — your ${name} are level with ${winners}, which got the extra time this week`;
  const tie = (all: string, picked: string) =>
    `${all} are the same distance from target, to within a rounding error. The plan boosts two categories, so it gave the extra time to ${picked} — nothing in these numbers separates them.`;

  it("ranks neither side of a tie for first", () => {
    expect(payload(rounds({ penaltiesPer9: 2, threePuttsPer9: 2 }))).toEqual([
      `${built} Your penalty strokes and your three putts ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the furthest from target",
      "strike x2: Baseline allocation",
      "lowpoint x2: Baseline allocation",
      "sim x2: Your penalty strokes are among the furthest from target",
      "sink x4: Your three putts are among the furthest from target",
      "lag x3: Your three putts are among the furthest from target",
      ...STANDARD,
    ]);
  });

  it("names the category that ties its way out, and the block it lost to", () => {
    // doubles and three putts are level at 1.0; slice(0, 2) keeps doubles on
    // declaration order alone (#35), so three putts must not read as unflagged
    expect(payload(rounds({ penaltiesPer9: 3, doublesPer9: 2, threePuttsPer9: 2 }))).toEqual([
      `${built} Your penalty strokes and your doubles or worse ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the furthest from target",
      "strike x2: Baseline allocation",
      "lowpoint x3: Your doubles or worse are among the furthest from target",
      "sim x2: Your penalty strokes and your doubles or worse are among the furthest from target",
      `sink x3: ${level("three putts", "your doubles or worse")}`,
      `lag x2: ${level("three putts", "your doubles or worse")}`,
      tie("Your doubles or worse and your three putts", "your doubles or worse"),
      ...STANDARD,
    ]);
  });

  const W4 = "your greens hit and your penalty strokes";

  it("owns up to both picks when the whole top of the list is level", () => {
    // all four categories at gap 0.25: neither boost was earned over the other
    expect(payload(rounds({ girPer9: 2.625, penaltiesPer9: 1.25, doublesPer9: 1.25, threePuttsPer9: 1.25 }))).toEqual([
      `${built} Your greens hit and your penalty strokes ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x3: Your greens hit are among the furthest from target",
      "driver x2: Your penalty strokes are among the furthest from target",
      "strike x3: Your greens hit are among the furthest from target",
      `lowpoint x2: ${level("doubles or worse", W4)}`,
      "sim x2: Your penalty strokes are among the furthest from target",
      `sink x3: ${level("three putts", W4)}`,
      `lag x2: ${level("three putts", W4)}`,
      tie(
        "Your greens hit, your penalty strokes, your doubles or worse and your three putts",
        "your greens hit and your penalty strokes",
      ),
      ...STANDARD,
    ]);
  });

  it("owns up to both picks when three are level and two win", () => {
    const W3 = "your penalty strokes and your doubles or worse";
    expect(payload(rounds({ penaltiesPer9: 2, doublesPer9: 2, threePuttsPer9: 2 }))).toEqual([
      `${built} Your penalty strokes and your doubles or worse ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the furthest from target",
      "strike x2: Baseline allocation",
      "lowpoint x3: Your doubles or worse are among the furthest from target",
      "sim x2: Your penalty strokes and your doubles or worse are among the furthest from target",
      `sink x3: ${level("three putts", W3)}`,
      `lag x2: ${level("three putts", W3)}`,
      tie("Your penalty strokes, your doubles or worse and your three putts", W3),
      ...STANDARD,
    ]);
  });

  it("counts a tie the last bit disagrees about", () => {
    // gir averages 7/6 and penalties 10/6: the same distance from target in
    // arithmetic, 1 ulp apart in floating point. An === tie check drops greens
    // hit from the payload entirely and this is the case that catches it.
    const near: RoundSummary[] = [2, 2, 1, 1, 1, 0].map((g, i) => ({
      scorePer9: 45, girPer9: g, doublesPer9: 3, threePuttsPer9: 1,
      penaltiesPer9: [2, 2, 2, 2, 1, 1][i],
    }));
    expect(payload(near)).toContain(
      tie("Your penalty strokes and your greens hit", "your penalty strokes"),
    );
    expect(payload(near)).toContain(`wedge x2: ${level("greens hit", "your penalty strokes")}`);
  });

  it("says nothing about a tie when a third deficit is genuinely behind", () => {
    // gaps 2.0 / 1.0 / 0.995. Close enough that a widened tolerance would call
    // them level; distinct enough that they are not. Two categories the app
    // can actually separate must not get the tie caveat or the level note.
    expect(payload(rounds({ penaltiesPer9: 3, doublesPer9: 2, threePuttsPer9: 1.995 }))).toEqual([
      `${built} Your penalty strokes and your doubles or worse ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x2: Baseline allocation",
      "driver x2: Your penalty strokes are among the furthest from target",
      "strike x2: Baseline allocation",
      "lowpoint x3: Your doubles or worse are among the furthest from target",
      "sim x2: Your penalty strokes and your doubles or worse are among the furthest from target",
      "sink x3: Baseline allocation",
      "lag x2: Baseline allocation",
      ...STANDARD,
    ]);
  });

  it("ranks neither even when the two are clearly separated", () => {
    // three putts 1.0, greens hit 0.43 — a real gap, and still no ordering is
    // claimed, because a two-item list read as a ranking is what started this
    expect(payload(rounds({ girPer9: 2, threePuttsPer9: 2 }))).toEqual([
      `${built} Your three putts and your greens hit ${boosted}`,
      "debrief x1: Baseline allocation",
      "wedge x3: Your greens hit are among the furthest from target",
      "driver x1: Baseline allocation",
      "strike x3: Your greens hit are among the furthest from target",
      "lowpoint x2: Baseline allocation",
      "sim x1: Baseline allocation",
      "sink x4: Your three putts are among the furthest from target",
      "lag x3: Your three putts are among the furthest from target",
      ...STANDARD,
    ]);
  });
});
