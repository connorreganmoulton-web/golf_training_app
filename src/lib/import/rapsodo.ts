import Papa from "papaparse";
import { ImportAdapter, ParsedSession, ParsedShot, normalizeClub, num } from "./types";

/**
 * Rapsodo MLM2PRO shot export.
 *
 * File shape (verified against a real export):
 *
 *   "Rapsodo MLM2PRO: Name - 06/22/2026 8:07 PM",,,,,,
 *   <blank>
 *   "Club Type","Club Brand","Club Model","Carry Distance",...
 *   "pw","Srixon","Zxi4","105.0",...
 *   ...
 *   "Average",...
 *   "Std. Dev.",...
 *   "Club Type","Club Brand",...        <- header repeats per club block
 *   "7i",...
 *
 * Two things bite you here: the header row repeats for every club, and each
 * block ends with Average / Std. Dev. rows that look like shots but aren't.
 * We recompute those ourselves rather than trusting them, because the user may
 * exclude mishits after import and the file's averages would then be stale.
 */

const SKIP_FIRST_CELL = new Set(["club type", "average", "std. dev.", "std dev", ""]);

export const rapsodoMlm2Pro: ImportAdapter = {
  id: "rapsodo-mlm2pro",
  label: "Rapsodo MLM2PRO",
  exportHint:
    "In the Rapsodo app, open a session, tap the share icon, and choose Export Shot Data. Email it to yourself or save to Files.",

  sniff(text: string): boolean {
    const head = text.slice(0, 2000).toLowerCase();
    return head.includes("rapsodo") || (head.includes("club type") && head.includes("smash factor"));
  },

  parse(text: string): ParsedSession {
    const { data } = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (!data?.length) throw new Error("That file is empty.");

    // Session date lives in the title row.
    let date = new Date().toISOString().slice(0, 10);
    let dateFromFile = false;
    const title = String(data[0]?.[0] ?? "");
    const m = title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      date = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
      dateFromFile = true;
    }

    const headerIdx = data.findIndex((r) =>
      r.some((c) => String(c).trim().toLowerCase() === "club type")
    );
    if (headerIdx === -1) {
      throw new Error(
        "No 'Club Type' column found. This looks like a summary export rather than shot data."
      );
    }

    const header = data[headerIdx].map((c) => String(c).trim().toLowerCase());
    const at = (name: string) => header.indexOf(name);

    const cols = {
      brand: at("club brand"),
      model: at("club model"),
      carry: at("carry distance"),
      total: at("total distance"),
      ballSpeed: at("ball speed"),
      launchAngle: at("launch angle"),
      launchDir: at("launch direction"),
      apex: at("apex"),
      sideCarry: at("side carry"),
      clubSpeed: at("club speed"),
      smash: at("smash factor"),
      descent: at("descent angle"),
      attack: at("attack angle"),
      path: at("club path"),
      spin: at("spin rate"),
      spinAxis: at("spin axis"),
    };

    const shots: ParsedShot[] = [];
    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row?.length) continue;

      const first = String(row[0] ?? "").trim();
      if (SKIP_FIRST_CELL.has(first.toLowerCase())) continue;

      const pick = (idx: number) => (idx >= 0 ? num(row[idx]) : undefined);
      const carry = pick(cols.carry);
      // A row with no carry number isn't a shot.
      if (carry === undefined) continue;

      const str = (idx: number) => {
        const v = idx >= 0 ? String(row[idx] ?? "").trim() : "";
        return v || undefined;
      };

      shots.push({
        club: normalizeClub(first),
        clubBrand: str(cols.brand),
        clubModel: str(cols.model),
        carry,
        total: pick(cols.total),
        ballSpeed: pick(cols.ballSpeed),
        clubSpeed: pick(cols.clubSpeed),
        smashFactor: pick(cols.smash),
        launchAngle: pick(cols.launchAngle),
        launchDir: pick(cols.launchDir),
        apex: pick(cols.apex),
        sideCarry: pick(cols.sideCarry),
        descentAngle: pick(cols.descent),
        attackAngle: pick(cols.attack),
        clubPath: pick(cols.path),
        spinRate: pick(cols.spin),
        spinAxis: pick(cols.spinAxis),
      });
    }

    if (!shots.length) {
      throw new Error("Found the header but no shot rows underneath it.");
    }

    return { date, dateFromFile, shots };
  },
};
