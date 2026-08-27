import type { ParsedShot } from "@/lib/import/types";

/**
 * Shot-level analysis.
 *
 * The artifact only ever computed session averages, which hide the thing that
 * actually matters. Two players can average 161 yards with a 7 iron: one lands
 * every ball between 158 and 164, the other alternates 140s and 180s. The
 * average says they're identical. Dispersion says one of them can aim.
 */

export interface ClubStats {
  club: string;
  n: number;
  carryMean: number | null;
  carryMedian: number | null;
  /** Longest minus shortest. Loud, easy to explain, badly affected by one shank. */
  carrySpread: number | null;
  /** Standard deviation. The number to actually trend over time. */
  carrySd: number | null;
  /** Middle 80% of carries — spread with the two worst shots ignored. */
  carryP10: number | null;
  carryP90: number | null;
  /** Left-right miss, in yards. */
  sideSd: number | null;
  sideBias: number | null;
  ballSpeedMean: number | null;
  ballSpeedMax: number | null;
  smashMean: number | null;
  spinMean: number | null;
  /** Carry you can count on: the 20th percentile, not the average. */
  reliableCarry: number | null;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function sd(a: number[]): number | null {
  if (a.length < 2) return null;
  const m = mean(a)!;
  return Math.sqrt(a.reduce((acc, x) => acc + (x - m) ** 2, 0) / (a.length - 1));
}

const defined = (xs: (number | undefined)[]) => xs.filter((x): x is number => typeof x === "number");

export function statsByClub(shots: ParsedShot[]): ClubStats[] {
  const groups = new Map<string, ParsedShot[]>();
  for (const s of shots) {
    if (!groups.has(s.club)) groups.set(s.club, []);
    groups.get(s.club)!.push(s);
  }

  return [...groups.entries()].map(([club, rows]) => {
    const carries = defined(rows.map((r) => r.carry)).sort((a, b) => a - b);
    const sides = defined(rows.map((r) => r.sideCarry));
    const speeds = defined(rows.map((r) => r.ballSpeed));
    const smash = defined(rows.map((r) => r.smashFactor));
    const spin = defined(rows.map((r) => r.spinRate));

    return {
      club,
      n: rows.length,
      carryMean: mean(carries),
      carryMedian: quantile(carries, 0.5),
      carrySpread: carries.length ? carries[carries.length - 1] - carries[0] : null,
      carrySd: sd(carries),
      carryP10: quantile(carries, 0.1),
      carryP90: quantile(carries, 0.9),
      sideSd: sd(sides),
      sideBias: mean(sides),
      ballSpeedMean: mean(speeds),
      ballSpeedMax: speeds.length ? Math.max(...speeds) : null,
      smashMean: mean(smash),
      spinMean: mean(spin),
      reliableCarry: quantile(carries, 0.2),
    };
  });
}

/**
 * Gaps between consecutive clubs, using reliable carry rather than average.
 * A 30-yard hole in the bag is a scoring problem no swing change fixes.
 */
export function findGaps(stats: ClubStats[], maxGap = 15) {
  const ordered = stats
    .filter((s) => s.reliableCarry !== null && s.n >= 3)
    .sort((a, b) => b.reliableCarry! - a.reliableCarry!);

  const gaps = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    const gap = ordered[i].reliableCarry! - ordered[i + 1].reliableCarry!;
    gaps.push({
      from: ordered[i].club,
      to: ordered[i + 1].club,
      yards: Math.round(gap),
      problem: gap > maxGap,
    });
  }
  return gaps;
}

/**
 * Flags shots far enough from the club's own distribution that they were
 * probably mishits worth excluding. Suggestion only — never auto-deletes,
 * because deciding a shot "didn't count" is the user's call, not ours.
 */
export function suggestExclusions(shots: ParsedShot[], sigma = 2.5): number[] {
  const out: number[] = [];
  const byClub = new Map<string, { idx: number; carry: number }[]>();

  shots.forEach((s, idx) => {
    if (typeof s.carry !== "number") return;
    if (!byClub.has(s.club)) byClub.set(s.club, []);
    byClub.get(s.club)!.push({ idx, carry: s.carry });
  });

  for (const rows of byClub.values()) {
    if (rows.length < 5) continue;
    const carries = rows.map((r) => r.carry);
    const m = mean(carries)!;
    const s = sd(carries);
    if (!s) continue;
    for (const r of rows) if (Math.abs(r.carry - m) > sigma * s) out.push(r.idx);
  }
  return out;
}
