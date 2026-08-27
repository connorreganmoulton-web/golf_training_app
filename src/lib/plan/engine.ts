/**
 * Practice plan engine.
 *
 * The artifact shipped a fixed weekly schedule built from population averages
 * for a 15-handicap. That's the right starting point when you know nothing
 * about someone, and the wrong one the moment you have their data.
 *
 * This module does two things:
 *   1. Serves the default plan when evidence is thin (fewer than MIN_ROUNDS).
 *   2. Reweights the plan toward whatever the user's own numbers say is
 *      costing them most, once there's enough data to justify it.
 *
 * Honesty rule baked in: below MIN_ROUNDS we return the default plan AND say
 * why. We do not pretend four rounds of nine-hole golf is a diagnosis.
 */

export const MIN_ROUNDS = 6;

export type BlockId =
  | "debrief"
  | "wedge"
  | "driver"
  | "strike"
  | "lowpoint"
  | "sim"
  | "sink"
  | "lag";

export interface Block {
  id: BlockId;
  name: string;
  /** What this block is trying to fix. Shown to the user, not decoration. */
  why: string;
  setup: string;
  sessions: Record<15 | 30 | 60, string[]>;
  metricKey: string;
  metricLabel: string;
  unit: string;
  direction: "up" | "down";
  /** Can this block's number be computed from launch monitor data? */
  derivable: boolean;
  /** Baseline weekly slots before any personalization. */
  baseSlots: number;
  protect?: boolean;
}

export interface RoundSummary {
  scorePer9: number;
  girPer9: number;
  penaltiesPer9: number;
  doublesPer9: number;
  threePuttsPer9: number;
}

export interface PlanResult {
  blocks: { block: Block; slots: number; reason: string }[];
  personalized: boolean;
  /** Plain-language explanation shown in the UI. Never omitted. */
  rationale: string;
  caveats: string[];
}

// Benchmarks for a mid-handicap playing nine holes. Sources are documented in
// docs/BENCHMARKS.md — these are targets, not promises.
const TARGETS = {
  girPer9: 3.5,
  penaltiesPer9: 1.0,
  doublesPer9: 1.0,
  threePuttsPer9: 1.0,
};

export const BLOCKS: Block[] = [
  {
    id: "debrief",
    name: "Debrief & Fix",
    why: "The round is still fresh. Fix the single biggest leak while you remember it. The only block where repeating the same shot is the point.",
    setup: "Last round open. One club.",
    sessions: {
      15: ["Name the single biggest leak from the last round, out loud.", "20 balls, that club, that shot only."],
      30: ["Name the leak.", "40 balls, same club, same target.", "Last 10: pause 20 seconds between each."],
      60: ["Name the leak.", "40 balls, same club, same target.", "20 more with a different club, same fault — check the fix holds."],
    },
    metricKey: "leak",
    metricLabel: "What you worked on",
    unit: "",
    direction: "up",
    derivable: false,
    baseSlots: 1,
  },
  {
    id: "wedge",
    name: "Wedge Matrix",
    why: "Full-swing wedge numbers tell you nothing about the 40-to-110 zone, which is where scoring actually happens.",
    setup: "PW, GW, SW at 9:00, 10:00 and 11:00 backswings.",
    sessions: {
      15: ["One wedge, 5 balls at each of the three lengths.", "Record three carry numbers."],
      30: ["Two wedges, 6 cells, 5 balls each. Throw out the worst."],
      60: ["All nine cells, 8 balls each.", "Re-hit the three you trust least."],
    },
    metricKey: "wedgeCells",
    metricLabel: "Cells logged",
    unit: "/ 9",
    direction: "up",
    derivable: false, // exports don't record backswing length
    baseSlots: 2,
  },
  {
    id: "driver",
    name: "Driver & Speed",
    why: "Short, defensive tee shots cost more than missed fairways. A long drive in the rough usually beats a short one in the fairway.",
    setup: "Full swings. If your net makes you flinch, fix that before hitting a ball.",
    sessions: {
      15: ["15 full-speed drivers.", "Log the fastest ball speed."],
      30: ["15 full speed, then 10 fairway finders at three-quarter tempo."],
      60: ["Alternate 5 full / 5 controlled, five times through.", "Note which one you'd trust on a tight hole."],
    },
    metricKey: "ballSpeedMax",
    metricLabel: "Ball speed",
    unit: "mph",
    direction: "up",
    derivable: true,
    baseSlots: 1,
  },
  {
    id: "strike",
    name: "Iron Strike Quality",
    why: "Approach play is the largest category of lost strokes at every handicap. Low point control fixes fat irons and chunked chips at once.",
    setup: "Towel folded 3 to 4 inches behind the ball.",
    sessions: {
      15: ["10 balls, 7 iron.", "Log longest carry minus shortest."],
      30: ["10 balls each with 7i, 8i, 9i.", "Log the 7 iron spread."],
      60: ["10 each with 7i, 8i, 9i.", "30 shots in random club order, one ball per club.", "Log the spread from the random block."],
    },
    metricKey: "carrySpread",
    metricLabel: "7i carry spread",
    unit: "yds",
    direction: "down",
    derivable: true,
    baseSlots: 2,
    protect: true,
  },
  {
    id: "lowpoint",
    name: "Low Point & Landing",
    why: "A substitute for short game practice when you have no chipping green. Trains contact and landing spot — the parts that transfer.",
    setup: "Towel on the floor 15 to 20 feet away. Foam balls.",
    sessions: {
      15: ["30 foam balls at the towel. Count the hits."],
      30: ["Three distances, 10 balls each."],
      60: ["Three distances, 10 each.", "Then 20 putts with an 8 iron — clean contact only."],
    },
    metricKey: "towelHits",
    metricLabel: "Towel hits",
    unit: "/ 30",
    direction: "up",
    derivable: false,
    baseSlots: 2,
  },
  {
    id: "sim",
    name: "Simulated Holes",
    why: "The only practice that rehearses decisions rather than swings. Highest transfer to actual scoring.",
    setup: "A real scorecard. One ball per shot, no do-overs.",
    sessions: {
      15: ["Play 3 holes. Drive, read the carry, subtract, hit that exact approach number."],
      30: ["Play 6 holes.", "Then short putts until you make 10 in a row."],
      60: ["Play 9.", "Then 3-to-6 footers until you make 20 in a row. Restart on a miss."],
    },
    metricKey: "simScore",
    metricLabel: "Score to par",
    unit: "",
    direction: "down",
    derivable: false,
    baseSlots: 1,
    protect: true,
  },
  {
    id: "sink",
    name: "Short Putts",
    why: "The 3-to-6 foot zone is where handicaps separate. Beyond 40 feet, make rates are identical at every level.",
    setup: "Putting mat, 3 to 6 feet.",
    sessions: {
      15: ["Make 10 in a row. Restart the count on a miss."],
      30: ["Make 20 in a row from three different lengths."],
      60: ["20 in a row, then a pressure ladder: 3, 4, 5, 6 feet, restart on any miss."],
    },
    metricKey: "puttStreak",
    metricLabel: "Made in a row",
    unit: "",
    direction: "up",
    derivable: false,
    baseSlots: 3,
  },
  {
    id: "lag",
    name: "Lag & Speed",
    why: "Three-putt avoidance, not long-putt makes. Better players leave them close; they don't hole them.",
    setup: "Longest run your mat allows.",
    sessions: {
      15: ["10 lags. Count how many finish inside 3 feet."],
      30: ["Three distances, 10 lags each."],
      60: ["Three distances, 10 each, then 20 short putts to finish."],
    },
    metricKey: "lagInside3",
    metricLabel: "Inside 3 ft",
    unit: "/ 10",
    direction: "up",
    derivable: false,
    baseSlots: 2,
  },
];

/** Which blocks each on-course weakness points at. */
const REMEDIES: Record<keyof typeof TARGETS, BlockId[]> = {
  girPer9: ["strike", "wedge"],
  penaltiesPer9: ["sim", "driver"],
  doublesPer9: ["sim", "lowpoint"],
  threePuttsPer9: ["lag", "sink"],
};

export function buildPlan(rounds: RoundSummary[]): PlanResult {
  const blocks = BLOCKS.map((block) => ({
    block,
    slots: block.baseSlots,
    reason: "Baseline allocation",
  }));

  if (rounds.length < MIN_ROUNDS) {
    return {
      blocks,
      personalized: false,
      rationale: `Using the default plan. ${rounds.length} of ${MIN_ROUNDS} rounds logged — below that, the numbers are too noisy to reweight anything, and a plan built on four nine-hole rounds would be guessing dressed up as analysis.`,
      caveats: [
        "This allocation comes from what typically costs mid-handicaps the most, not from your data yet.",
        "Log rounds honestly, including the ugly ones. Selective logging produces a confident wrong plan.",
      ],
    };
  }

  const recent = rounds.slice(-8);
  const avg = (k: keyof RoundSummary) =>
    recent.reduce((a, r) => a + r[k], 0) / recent.length;

  // Score each category by how far it sits from target, normalized so the
  // categories are comparable to each other.
  type Deficit = { key: keyof typeof TARGETS; gap: number };
  const deficits: Deficit[] = ([
    { key: "girPer9", gap: (TARGETS.girPer9 - avg("girPer9")) / TARGETS.girPer9 },
    { key: "penaltiesPer9", gap: (avg("penaltiesPer9") - TARGETS.penaltiesPer9) / TARGETS.penaltiesPer9 },
    { key: "doublesPer9", gap: (avg("doublesPer9") - TARGETS.doublesPer9) / TARGETS.doublesPer9 },
    { key: "threePuttsPer9", gap: (avg("threePuttsPer9") - TARGETS.threePuttsPer9) / TARGETS.threePuttsPer9 },
  ] as Deficit[])
    .filter((d) => d.gap > 0.15)
    .sort((a, b) => b.gap - a.gap);

  if (!deficits.length) {
    return {
      blocks,
      personalized: false,
      rationale:
        "You're at or near target in every tracked category. Keeping the balanced plan — nothing in your data justifies pulling time away from one area to feed another.",
      caveats: ["Targets are mid-handicap benchmarks. Hitting them means it's time to move the targets, not to stop practising."],
    };
  }

  // Give the worst two categories an extra slot each, taken from the best.
  const worst = deficits.slice(0, 2);
  const boosted = new Set<BlockId>();
  for (const d of worst) for (const id of REMEDIES[d.key]) boosted.add(id);

  const LABELS: Record<keyof typeof TARGETS, string> = {
    girPer9: "greens hit",
    penaltiesPer9: "penalty strokes",
    doublesPer9: "doubles or worse",
    threePuttsPer9: "three putts",
  };

  // A category can be as far from target as the last one that got a slot and
  // still miss out, because slice(0, 2) has to break the tie somehow (#35).
  // Say so without naming the mechanism — a tie the last bit disagrees about
  // is broken by the float, not by declaration order, so the payload says
  // only what is true either way: nothing in the numbers separates them. Name
  // every category in the tie including
  // the ones that won it — when three are level, both slots were arbitrary,
  // and disclosing only the loser leaves the winners reading as earned.
  // Tied means indistinguishable, not bit-identical: the same six numbers
  // added in a different order differ in the last bit, and a user equally bad
  // at two things is not served by that deciding which one gets practised.
  const cut = worst[worst.length - 1];
  const tiedGroup = deficits.filter((d) => Math.abs(d.gap - cut.gap) < 1e-9);
  const leftOut = tiedGroup.filter((d) => !worst.includes(d));
  // Only the tied winners, not every boosted category: worst[0] can be miles
  // clear of the tie, and saying the loser is level with it would be the same
  // fabrication as the superlative this replaced, pointing the other way.
  const tiedWinners = tiedGroup.filter((d) => worst.includes(d));
  const listNames = (ds: Deficit[]) => {
    const n = ds.map((d) => `your ${LABELS[d.key]}`);
    return n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}` : n[0];
  };

  const out = blocks.map((b) => {
    if (boosted.has(b.block.id)) {
      // A block can answer both deficits. The rank inside `worst` is not
      // claimable: gaps are float averages, so two categories the user is
      // equally bad at differ in the last bit as often as they compare equal,
      // and sort() then orders them by the declaration order of `deficits`.
      // Name the categories, claim no ordering between them. (That the plan
      // boosts only two when a third is equally far is #35, not a copy fix.)
      const causes = worst.filter((d) => REMEDIES[d.key].includes(b.block.id));
      // " and your " not " and ": "your doubles or worse and penalty strokes"
      // garden-paths on the first label.
      const names = causes.map((d) => LABELS[d.key]).join(" and your ");
      return {
        ...b,
        slots: b.slots + 1,
        reason:
          worst.length === 1
            ? `Your ${names} are the furthest from target`
            : `Your ${names} are among the furthest from target`,
      };
    }
    // The tie's losers keep their baseline slots, but "Baseline allocation"
    // alone is what an untouched category says, and theirs was touched.
    const level = leftOut.filter((d) => REMEDIES[d.key].includes(b.block.id));
    if (level.length) {
      return {
        ...b,
        reason: `Baseline allocation — ${listNames(level)} are level with ${listNames(tiedWinners)}, which got the extra time this week`,
      };
    }
    return b;
  });

  return {
    blocks: out,
    personalized: true,
    rationale: `Built from your last ${recent.length} rounds. ${
      worst.length > 1
        ? `Your ${LABELS[worst[0].key]} and your ${LABELS[worst[1].key]} are among the furthest from target`
        : `Your ${LABELS[worst[0].key]} are the furthest from target`
    }, so the blocks that address them got an extra slot this week.`,
    caveats: [
      ...(leftOut.length
        ? [
            `${listNames(tiedGroup).replace(/^y/, "Y")} are the same distance from target, to within a rounding error. The plan boosts two categories, so it gave the extra time to ${listNames(
              tiedWinners,
            )} — nothing in these numbers separates them.`,
          ]
        : []),
      "Nine-hole samples are small. One blow-up hole can move a category for weeks.",
      "This reweights practice time. It cannot tell you whether a category moved because you improved or because the course was easier.",
    ],
  };
}

/** The plan week runs Thursday to Wednesday, ending on the day you play. */
export function weekStart(d: Date): Date {
  const out = new Date(d);
  out.setHours(12, 0, 0, 0);
  out.setDate(out.getDate() - ((out.getDay() - 4 + 7) % 7));
  return out;
}
