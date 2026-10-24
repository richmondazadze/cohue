import { z } from "zod";
import {
  HashSchema,
  IdSchema,
  LanguageSchema,
  ScopeSchema,
  TextSchema,
  TimestampSchema,
  VersionSchema,
} from "./primitives";
export const MEDIA_LIMITS = {
  maxBytes: 3_000_000,
  maxDurationMs: 60_000,
  synthesizedTtlSeconds: 86400,
} as const;
export const AudioMimeSchema = z.enum([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
]);
export const TranscriptionMetadataSchema = z.strictObject({
  purpose: z.enum(["PROFILE", "MISSION", "INVITATION_RESPONSE"]),
  language: LanguageSchema,
  mimeType: AudioMimeSchema,
  sizeBytes: z.number().int().positive().max(MEDIA_LIMITS.maxBytes),
  durationMs: z.number().int().positive().max(MEDIA_LIMITS.maxDurationMs),
});
export const LocalizedTextSchema = z.strictObject({
  id: IdSchema,
  sourceId: IdSchema,
  sourceVersion: VersionSchema,
  version: VersionSchema,
  canonicalTextHash: HashSchema,
  language: LanguageSchema,
  originalLanguage: LanguageSchema,
  text: TextSchema,
  status: z.enum(["GENERATED", "REVIEW_REQUIRED", "APPROVED", "FAILED"]),
  generatedAt: TimestampSchema,
});
export const AudioArtifactSchema = z
  .strictObject({
    id: IdSchema,
    ownerId: IdSchema,
    scope: ScopeSchema,
    purpose: z.enum(["PROFILE", "MISSION", "INVITATION", "BRIEF"]),
    language: LanguageSchema,
    canonicalTextHash: HashSchema.nullable(),
    status: z.enum(["PENDING", "READY", "FAILED", "EXPIRED"]),
    expiresAt: TimestampSchema,
    accessPath: z
      .string()
      .regex(/^\/api\/media\/[a-f0-9-]{36}$/)
      .nullable(),
  })
  .refine(
    (v) =>
      v.status === "READY" ? v.accessPath !== null : v.accessPath === null,
    "Only ready audio exposes an authenticated media path",
  );
export const TranscriptionResultSchema = z.strictObject({
  transcript: TextSchema,
  language: LanguageSchema,
  status: z.literal("REVIEW_REQUIRED"),
  rawAudioDeleted: z.literal(true),
});
