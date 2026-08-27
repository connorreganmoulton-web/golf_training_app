import { createHash } from "node:crypto";
import { detectAdapter, ADAPTERS, type ImportAdapter, type ParsedSession } from "@/lib/import";

const MAX_BYTES = 5 * 1024 * 1024; // a shot export is tens of KB; this is a typo guard

export class UploadError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message);
  }
}

export interface Upload {
  /** The rest of the multipart body — confirm reads blockId/exclusions from it. */
  form: FormData;
  filename: string;
  text: string;
  checksum: string;
  adapter: ImportAdapter;
  session: ParsedSession;
}

/** Reads the uploaded CSV, picks the adapter, parses. Throws UploadError. */
export async function readUpload(req: Request): Promise<Upload> {
  const form = await req.formData().catch(() => null);
  if (!form) throw new UploadError("That upload wasn't a file.");
  const file = form.get("file");
  if (!(file instanceof File)) throw new UploadError("No file was uploaded.");
  if (file.size > MAX_BYTES) throw new UploadError("That file is larger than 5 MB — it probably isn't a shot export.");

  const text = await file.text();
  const adapter = detectAdapter(text);
  if (!adapter) {
    throw new UploadError("Couldn't tell which launch monitor this file came from.", {
      supported: ADAPTERS.map((a) => ({ id: a.id, label: a.label, exportHint: a.exportHint })),
    });
  }

  // Hash the file, not the parse, so a re-upload of the same export is caught
  // before it can duplicate a session and bend every trend downstream.
  const checksum = createHash("sha256").update(text).digest("hex");

  let session: ParsedSession;
  try {
    session = adapter.parse(text);
  } catch (e) {
    throw new UploadError(e instanceof Error ? e.message : "Couldn't read that file.");
  }

  return { form, filename: file.name, text, checksum, adapter, session };
}

export function uploadErrorResponse(e: unknown) {
  if (e instanceof UploadError) {
    return Response.json({ error: e.message, ...(e.detail as object ?? {}) }, { status: 400 });
  }
  console.error(e);
  return Response.json({ error: "Something went wrong reading that file." }, { status: 500 });
}
