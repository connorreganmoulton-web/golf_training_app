import { PrismaClient, type Round } from "@prisma/client";
import type { RoundSummary } from "@/lib/plan/engine";

// Next dev reloads modules on every edit; without this you leak a connection
// pool per reload until SQLite starts refusing you.
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

/**
 * SINGLE_USER=true is the default and means there is no login and no account.
 * Everything hangs off one fixed row so the multi-user schema still works
 * unchanged when hosting is switched on.
 */
export const SINGLE_USER = process.env.SINGLE_USER !== "false";

export async function currentUserId(): Promise<string> {
  // ponytail: single-user only. Wire Auth.js here when SINGLE_USER=false.
  if (!SINGLE_USER) throw new Error("Multi-user mode is not wired up yet.");
  const u = await prisma.user.upsert({
    where: { id: "single" },
    create: { id: "single", name: "You" },
    update: {},
  });
  return u.id;
}

/**
 * Rounds normalize to nine holes so an occasional eighteen doesn't distort a
 * trend built mostly from nines.
 */
export function toSummary(r: Round): RoundSummary | null {
  // A blank field means "not recorded", not zero. Scoring a missing greens
  // count as zero greens would invent a bad round the user never played, so
  // incomplete rounds sit out of the plan math entirely.
  if (
    r.gir === null ||
    r.penalties === null ||
    r.doubles === null ||
    r.threePutts === null
  ) {
    return null;
  }
  const per9 = 9 / (r.holes || 9);
  return {
    scorePer9: r.score * per9,
    girPer9: r.gir * per9,
    penaltiesPer9: r.penalties * per9,
    doublesPer9: r.doubles * per9,
    threePuttsPer9: r.threePutts * per9,
  };
}

/** Oldest first — buildPlan() reads the tail. */
export async function roundSummaries(userId: string) {
  const rounds = await prisma.round.findMany({
    where: { userId },
    orderBy: { playedAt: "asc" },
  });
  return {
    total: rounds.length,
    summaries: rounds.map(toSummary).filter((s): s is RoundSummary => s !== null),
  };
}
