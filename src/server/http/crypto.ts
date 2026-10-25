import "server-only";
import { createHash, createHmac, hkdfSync, randomBytes } from "node:crypto";
import { required } from "../config/env";

export const sha256 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");
export const newToken = (): string => randomBytes(32).toString("base64url");
const derived = new Map<string, Buffer>();
// Purpose-separated keys derived from SESSION_SECRET; no extra environment variables.
export function derivedKey(label: string): Buffer {
  let key = derived.get(label);
  if (!key) {
    key = Buffer.from(
      hkdfSync("sha256", required("SESSION_SECRET"), "cohue", label, 32),
    );
    derived.set(label, key);
  }
  return key;
}
export const hmac = (label: string, value: string): string =>
  createHmac("sha256", derivedKey(label)).update(value).digest("base64url");
export const tokenHash = (token: string): string =>
  createHmac("sha256", derivedKey("cohue-token-hash-v1")).update(token).digest("hex");
