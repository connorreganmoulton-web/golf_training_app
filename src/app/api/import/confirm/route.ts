import { prisma, currentUserId } from "@/lib/db";
import { statsByClub } from "@/lib/analytics/shots";
import { BLOCKS, type BlockId } from "@/lib/plan/engine";
import { readUpload, uploadErrorResponse, UploadError } from "../shared";

const BLOCK_IDS = new Set<string>(BLOCKS.map((b) => b.id));

/**
 * Saves a previewed import. Takes the same file again rather than trusting a
 * round-trip of parsed shots, plus the block the user chose and the indexes
 * they agreed were mishits.
 */
export async function POST(req: Request) {
  try {
    const { form, filename, checksum, adapter, session } = await readUpload(req);
    const userId = await currentUserId();

    const rawBlock = String(form.get("blockId") ?? "");
    if (rawBlock && !BLOCK_IDS.has(rawBlock)) throw new UploadError(`Unknown practice block "${rawBlock}".`);
    const blockId = (rawBlock || null) as BlockId | null;

    const minutes = Number(form.get("minutes"));
    const notes = String(form.get("notes") ?? "").trim() || null;

    let excluded: Set<number>;
    try {
      const raw = JSON.parse(String(form.get("excluded") ?? "[]"));
      if (!Array.isArray(raw)) throw new Error();
      excluded = new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < session.shots.length));
    } catch {
      throw new UploadError("Couldn't read the excluded-shot list.");
    }

    // Re-importing the same export is a no-op. A double-clicked upload that
    // duplicated a session would quietly bend every trend built on it.
    const existing = await prisma.importBatch.findUnique({
      where: { userId_checksum: { userId, checksum } },
      include: { sessions: { select: { id: true } } },
    });
    if (existing) {
      return Response.json({
        duplicate: true,
        batchId: existing.id,
        sessionId: existing.sessions[0]?.id ?? null,
        message: "Already imported — nothing was saved a second time.",
      });
    }

    // Derived numbers are computed from the shots the user kept, so excluding
    // a shank actually moves the block's score.
    const kept = session.shots.filter((_, i) => !excluded.has(i));
    const stats = statsByClub(kept);
    const metrics: { key: string; value: number; unit: string; derived: boolean }[] = [];
    const spread = stats.find((s) => s.club === "7i")?.carrySpread;
    if (typeof spread === "number") metrics.push({ key: "carrySpread", value: spread, unit: "yds", derived: true });
    const speed = stats.find((s) => s.club === "d")?.ballSpeedMax;
    if (typeof speed === "number") metrics.push({ key: "ballSpeedMax", value: speed, unit: "mph", derived: true });

    // Noon local so the date the device recorded doesn't slide a day on
    // whichever side of UTC the user lives.
    const occurredAt = new Date(`${session.date}T12:00:00`);

    const batch = await prisma.importBatch.create({
      data: {
        userId,
        adapter: adapter.id,
        filename,
        checksum,
        rowCount: session.shots.length,
        sessions: {
          create: {
            userId,
            occurredAt,
            blockId,
            minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
            notes,
            source: adapter.id,
            shots: {
              create: session.shots.map((s, i) => ({ ...s, excluded: excluded.has(i) })),
            },
            metrics: { create: metrics },
          },
        },
      },
      include: { sessions: { select: { id: true } } },
    });

    return Response.json({
      duplicate: false,
      batchId: batch.id,
      sessionId: batch.sessions[0].id,
      saved: session.shots.length,
      excluded: excluded.size,
      blockId,
    });
  } catch (e) {
    return uploadErrorResponse(e);
  }
}
