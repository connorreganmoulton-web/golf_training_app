import { currentUserId, roundSummaries } from "@/lib/db";
import { buildPlan, MIN_ROUNDS } from "@/lib/plan/engine";

export async function GET() {
  const userId = await currentUserId();
  const { total, summaries } = await roundSummaries(userId);

  return Response.json({
    ...buildPlan(summaries),
    minRounds: MIN_ROUNDS,
    roundsLogged: total,
    // Rounds missing greens/penalties/doubles/three-putts can't feed the plan
    // without inventing zeros, so they're counted but not used.
    roundsUsable: summaries.length,
  });
}
