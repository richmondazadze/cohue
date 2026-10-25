"use client";
import { useRef } from "react";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { ApiInput, ApiOperation, ApiParams } from "@/contracts";
import {
  ApiRequestError,
  callApi,
  newIdempotencyKey,
  type ApiData,
} from "./http";

/** Deterministic JSON for comparing two submissions (object keys sorted, arrays kept in order). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/**
 * One Idempotency-Key per deliberate decision. Retrying the identical submission (after a network
 * failure, a retryable error, or a lost response) reuses the key so the server can replay its receipt.
 * A changed payload is a new decision and gets a new key; a confirmed success retires the key.
 */
export class CommandKeyRing {
  private key: string | null = null;
  private digest: string | null = null;
  constructor(private readonly mint: () => string = newIdempotencyKey) {}
  keyFor(digest: string): string {
    if (this.key && this.digest === digest) return this.key;
    this.key = this.mint();
    this.digest = digest;
    return this.key;
  }
  settle(): void {
    this.key = null;
    this.digest = null;
  }
  get pendingKey(): string | null {
    return this.key;
  }
}

export type CommandVariables<K extends ApiOperation> = {
  params?: ApiParams<K>;
  input?: ApiInput<K>;
};

export function useCommand<K extends ApiOperation>(
  operation: K,
  options: Omit<
    UseMutationOptions<ApiData<K>, ApiRequestError, CommandVariables<K>>,
    "mutationFn"
  > = {},
) {
  const ring = useRef<CommandKeyRing | null>(null);
  return useMutation<ApiData<K>, ApiRequestError, CommandVariables<K>>({
    retry: false,
    ...options,
    mutationFn: async (vars) => {
      ring.current ??= new CommandKeyRing();
      const key = ring.current.keyFor(
        stableStringify({ operation, params: vars.params, input: vars.input }),
      );
      const data = await callApi(operation, {
        params: vars.params,
        input: vars.input,
        idempotencyKey: key,
      });
      ring.current.settle();
      return data;
    },
  });
}
