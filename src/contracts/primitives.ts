import { z } from "zod";

export const CONTRACT_VERSION = "1.1.0" as const;
export const IdSchema = z.uuid();
export const TimestampSchema = z.iso.datetime({ offset: false });
export const VersionSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
export const SequenceSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);
export const LanguageSchema = z
  .string()
  .min(2)
  .max(35)
  .refine((value) => {
    try {
      return Intl.getCanonicalLocales(value).length === 1;
    } catch {
      return false;
    }
  }, "Use a valid BCP-47 language tag");
export const TimezoneSchema = z
  .string()
  .min(1)
  .max(80)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone");
export const TextSchema = z.string().trim().min(1).max(2000);
export const LabelSchema = z.string().trim().min(1).max(120);
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const PublicUrlSchema = z
  .url()
  .refine(
    (value) => ["https:", "http:"].includes(new URL(value).protocol),
    "HTTP(S) only",
  );
export const ScopeSchema = z.discriminatedUnion("executionMode", [
  z.strictObject({ executionMode: z.literal("LIVE"), showcaseId: z.null() }),
  z.strictObject({
    executionMode: z.literal("SHOWCASE"),
    showcaseId: IdSchema,
  }),
]);
export const IntervalSchema = z
  .strictObject({
    start: TimestampSchema,
    end: TimestampSchema,
    timezone: TimezoneSchema,
  })
  .refine(
    (value) => Date.parse(value.start) < Date.parse(value.end),
    "Interval start must precede end",
  );
export const IdListSchema = z
  .array(IdSchema)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Duplicate IDs");
export const PageQuerySchema = z.strictObject({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export const SchemaVersionSchema = z.literal(CONTRACT_VERSION);
export type Scope = z.infer<typeof ScopeSchema>;
export type Interval = z.infer<typeof IntervalSchema>;
