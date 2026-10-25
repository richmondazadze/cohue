import "server-only";
import { z } from "zod";

// Server-only configuration. Errors name variables, never values.
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));
const EnvSchema = z.object({
  DATABASE_URL: optional,
  EVENT_RETENTION_READY: optional.pipe(z.enum(["1"]).optional()).catch(undefined),
  DATABASE_MIGRATION_URL: optional,
  SESSION_SECRET: optional,
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: optional,
  ELEVENLABS_API_KEY: optional,
  ELEVENLABS_STT_MODEL: optional,
  ELEVENLABS_TTS_MODEL: optional,
  ELEVENLABS_VOICE_ID: optional,
  SERPAPI_API_KEY: optional,
  DISPATCHER_SECRET: optional,
  DISPATCHER_MODE: optional.pipe(z.enum(["scheduled", "worker"]).optional()).catch(undefined),
  NEXT_PUBLIC_APP_URL: optional,
});
export type Env = z.infer<typeof EnvSchema>;
let cached: Env | undefined;
export function env(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}
export function required<K extends keyof Env>(name: K): NonNullable<Env[K]> {
  const value = env()[name];
  if (!value) throw new ConfigurationError(name);
  return value as NonNullable<Env[K]>;
}
export class ConfigurationError extends Error {
  constructor(readonly variable: string) {
    super(`Missing server configuration: ${variable}`);
    this.name = "ConfigurationError";
  }
}
