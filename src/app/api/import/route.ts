import { prisma, currentUserId } from "@/lib/db";
import { statsByClub, findGaps, suggestExclusions } from "@/lib/analytics/shots";
import { readUpload, uploadErrorResponse } from "./shared";

/**
 * Preview an import. Parses and analyses the file but saves nothing — the user
 * confirms the practice block and any mishit exclusions first, then POSTs the
 * same file to /api/import/confirm.
 */
export async function POST(req: Request) {
  try {
    const { filename, checksum, adapter, session } = await readUpload(req);
    const userId = await currentUserId();

    const existing = await prisma.importBatch.findUnique({
      where: { userId_checksum: { userId, checksum } },
      select: { id: true, createdAt: true, filename: true },
    });

    const stats = statsByClub(session.shots);

    return Response.json({
      adapter: { id: adapter.id, label: adapter.label },
      filename,
      checksum,
      date: session.date,
      dateFromFile: session.dateFromFile,
      shots: session.shots,
      stats,
      gaps: findGaps(stats),
      // Suggestions only. Nothing is dropped unless the user ticks it.
      suggestedExclusions: suggestExclusions(session.shots),
      alreadyImported: existing,
    });
  } catch (e) {
    return uploadErrorResponse(e);
  }
}
