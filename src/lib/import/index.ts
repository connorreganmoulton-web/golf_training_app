import { ImportAdapter } from "./types";
import { rapsodoMlm2Pro } from "./rapsodo";

/**
 * Adapter registry. Adding a device is: write the adapter, add it here,
 * drop a real export into tests/fixtures/. Nothing else.
 *
 * Roadmap, in rough order of how common they are among people who own a
 * home setup: TrackMan (TPS CSV), FlightScope Mevo/Mevo+, SkyTrak,
 * Garmin R10 (via Garmin Golf app export), GSPro, Awesome Golf.
 */
export const ADAPTERS: ImportAdapter[] = [rapsodoMlm2Pro];

export function detectAdapter(text: string): ImportAdapter | null {
  return ADAPTERS.find((a) => {
    try {
      return a.sniff(text);
    } catch {
      return false;
    }
  }) ?? null;
}

export * from "./types";
