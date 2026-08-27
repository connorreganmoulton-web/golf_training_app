import { z } from "zod";
import { prisma, currentUserId, toSummary } from "@/lib/db";

const count = z.number().int().min(0).max(36);

const RoundInput = z.object({
  playedAt: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  holes: z.union([z.literal(9), z.literal(18)]).default(9),
  par: z.number().int().min(27).max(80).default(36),
  course: z.string().trim().max(120).optional(),
  score: z.number().int().min(18).max(200),
  gir: count.optional(),
  fairways: count.optional(),
  penalties: count.optional(),
  doubles: count.optional(),
  threePutts: count.optional(),
  putts: count.optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = RoundInput.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "That round didn't make sense.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { playedAt, ...rest } = parsed.data;
  const userId = await currentUserId();

  const round = await prisma.round.create({
    data: {
      userId,
      // Noon local, so a round logged late at night keeps the date you played.
      playedAt: playedAt ? new Date(playedAt.length === 10 ? `${playedAt}T12:00:00` : playedAt) : new Date(),
      ...rest,
    },
  });
  return Response.json({ round, per9: toSummary(round) }, { status: 201 });
}

/** Newest first, each with its per-nine normalization so the UI doesn't redo the math. */
export async function GET() {
  const userId = await currentUserId();
  const rounds = await prisma.round.findMany({ where: { userId }, orderBy: { playedAt: "desc" } });
  return Response.json({
    rounds: rounds.map((r) => ({ ...r, per9: toSummary(r) })),
  });
}
