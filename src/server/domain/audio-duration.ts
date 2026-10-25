import "server-only";
import { parseBuffer } from "music-metadata";
import { MEDIA_LIMITS } from "@/contracts";
import { fail } from "../http/errors";

// Read only the bounded in-memory upload. Client-provided duration is never authoritative.
// Fail closed when a malformed/container-only upload has no measurable audio duration.
export async function validateAudioDuration(bytes: Uint8Array, mimeType: string): Promise<number> {
  let duration: number | undefined;
  try {
    const metadata = await parseBuffer(bytes, { mimeType, size: bytes.byteLength }, { duration: true, skipCovers: true });
    duration = metadata.format.duration;
  } catch {
    fail("INVALID_INPUT", "The recording could not be read; record again or type instead.", { audio: ["Invalid audio"] });
  }
  if (duration === undefined || !Number.isFinite(duration) || duration <= 0)
    fail("INVALID_INPUT", "The recording duration could not be verified; record again or type instead.", { audio: ["Unknown duration"] });
  const durationMs = duration! * 1000;
  if (durationMs > MEDIA_LIMITS.maxDurationMs)
    fail("INVALID_INPUT", "Recording is too long; keep it under 60 seconds.", { audio: ["Too long"] });
  return durationMs;
}
