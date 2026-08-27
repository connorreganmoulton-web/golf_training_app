/**
 * Importer adapters.
 *
 * Every launch monitor exports a slightly different CSV. Rather than a growing
 * pile of if-statements, each device gets one file implementing this interface.
 * Adding TrackMan or SkyTrak support means writing one adapter and registering
 * it — no changes anywhere else in the app.
 *
 * Adapters must be pure: text in, parsed data out. No database access, no
 * network, no filesystem. That keeps them trivially testable against a real
 * export file checked into tests/fixtures/.
 */

export interface ParsedShot {
  club: string; // normalized lowercase: "7i", "pw", "d"
  clubBrand?: string;
  clubModel?: string;
  carry?: number;
  total?: number;
  ballSpeed?: number;
  clubSpeed?: number;
  smashFactor?: number;
  launchAngle?: number;
  launchDir?: number;
  apex?: number;
  sideCarry?: number;
  descentAngle?: number;
  attackAngle?: number;
  clubPath?: number;
  spinRate?: number;
  spinAxis?: number;
}

export interface ParsedSession {
  /** ISO date (YYYY-MM-DD) taken from the file when the device records it. */
  date: string;
  /** True when the date came from the file, false when we fell back to today. */
  dateFromFile: boolean;
  shots: ParsedShot[];
}

export interface ImportAdapter {
  id: string;
  /** Shown in the UI file picker, e.g. "Rapsodo MLM2PRO". */
  label: string;
  /** Where the user finds the export in that device's app. */
  exportHint: string;
  /**
   * Cheap check run against the head of the file so the UI can auto-detect
   * which device an upload came from. Must not throw.
   */
  sniff(text: string): boolean;
  /** Throws a human-readable Error if the file is the wrong shape. */
  parse(text: string): ParsedSession;
}

/**
 * Club naming is inconsistent across devices ("7 Iron", "7i", "I7", "Driver",
 * "Dr", "D"). Normalizing at the adapter boundary means analytics code only
 * ever sees one spelling.
 */
export function normalizeClub(raw: string): string {
  const s = String(raw).trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!s) return "unknown";

  const direct: Record<string, string> = {
    d: "d",
    dr: "d",
    driver: "d",
    "1w": "d",
  };
  if (direct[s]) return direct[s];

  // wedges
  const wedge = s.match(/^(p|g|a|s|l)w$|^(pitching|gap|approach|sand|lob)wedge$/);
  if (wedge) {
    const letter = wedge[1] ?? wedge[2]![0];
    return `${letter}w`;
  }

  // irons: "7i", "i7", "7iron"
  const iron = s.match(/^(\d{1,2})i(ron)?$/) || s.match(/^i(\d{1,2})$/);
  if (iron) return `${iron[1]}i`;

  // woods and hybrids: "3w", "5wood", "4h", "hybrid4"
  const wood = s.match(/^(\d{1,2})w(ood)?$/);
  if (wood) return `${wood[1]}w`;
  const hyb = s.match(/^(\d{1,2})h(ybrid)?$/) || s.match(/^hybrid(\d{1,2})$/);
  if (hyb) return `${hyb[1]}h`;

  return s;
}

/** Parses a number, returning undefined for blanks and junk rather than NaN. */
export function num(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
