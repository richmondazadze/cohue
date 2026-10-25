import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  ApiErrorSchema,
  CommandHeadersSchema,
  ERROR_HTTP_STATUS,
  apiContracts,
  type ApiOperation,
  type ApiOutput,
  type Scope,
} from "@/contracts";
import type { z } from "zod";
import { ConfigurationError, env } from "../config/env";
import { query, transaction, type Tx } from "../db/client";
import { ApiFailure, fail } from "./errors";
import { sha256 } from "./crypto";
import { scopeColumns } from "./scope";
import {
  GUEST_COOKIE,
  INVITE_COOKIE,
  resolveSession,
  type SessionRecord,
} from "../auth/sessions";

type Contract<K extends ApiOperation> = (typeof apiContracts)[K];
export type Input<K extends ApiOperation> = z.output<Contract<K>["input"]>;
export type Data<K extends ApiOperation> = ApiOutput<K>["data"];
export type CookieWrite = { name: string; value: string; expires: Date };
export type Ctx<K extends ApiOperation> = {
  params: Record<string, string>;
  input: Input<K>;
  session: SessionRecord | null;
  invite: SessionRecord | null;
  correlationId: string;
  tx: Tx | null;
  cookies: CookieWrite[];
  request: NextRequest;
  file: File | null;
};
type Options<K extends ApiOperation> = {
  // Replay hook: rebuild response data from the stored receipt (e.g. recompute a derived token).
  replay?: (stored: unknown, ctx: Ctx<K>) => Promise<Data<K>>;
  // What is stored in the receipt; defaults to the response data.
  store?: (data: Data<K>) => unknown;
  // SESSION operations whose handler authorizes the source itself may run on an invitation session.
  acceptInvite?: boolean;
  // multipart/form-data with a JSON `metadata` part (validated as input) and one `audio` file part.
  multipart?: boolean;
};
type Handler<K extends ApiOperation> = (ctx: Ctx<K>) => Promise<Data<K>>;

const MUTATION = new Set(["POST", "PATCH", "DELETE"]);

export function route<K extends ApiOperation>(
  operation: K,
  handler: Handler<K>,
  options: Options<K> = {},
) {
  const contract = apiContracts[operation];
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ): Promise<Response> => {
    const correlationId = randomUUID();
    try {
      const rawParams = Object.fromEntries(
        Object.entries((await context.params) ?? {}).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.join("/") : v,
        ]),
      );
      // One [reference] segment serves both :token and :id invitation operations (CONTRACT_RESOLUTIONS routing note).
      if ("reference" in rawParams) {
        const key = /:(token|id)/.exec(contract.path)?.[1] ?? "id";
        rawParams[key] = rawParams.reference;
        delete rawParams.reference;
      }
      const params = contract.params.safeParse(rawParams);
      if (!params.success) fail("NOT_FOUND", "Unknown resource reference.");
      if (MUTATION.has(contract.method)) {
        checkOrigin(request);
        rateLimit(request);
      }
      let file: File | null = null;
      let input: unknown;
      if (options.multipart) {
        const form = await request.formData().catch(() => fail("INVALID_INPUT", "Expected multipart form data."));
        const audio = form.get("audio");
        file = audio instanceof File ? audio : null;
        let metadata: unknown = {};
        try {
          metadata = JSON.parse(String(form.get("metadata") ?? "{}"));
        } catch {
          fail("INVALID_INPUT", "metadata must be JSON.");
        }
        const parsed = contract.input.safeParse(metadata);
        if (!parsed.success) fail("INVALID_INPUT", "metadata does not match the contract.");
        input = parsed.data;
      } else input = await readInput(contract, request);
      const session = await resolveSession(request.cookies.get(GUEST_COOKIE)?.value);
      const invite = await resolveSession(request.cookies.get(INVITE_COOKIE)?.value);
      authorize(contract.auth, request, session ?? (options.acceptInvite ? invite : null), invite);
      const ctx: Ctx<K> = {
        params: params.data as Record<string, string>,
        input: input as Input<K>,
        session,
        invite,
        correlationId,
        tx: null,
        cookies: [],
        request,
        file,
      };
      let data: Data<K>;
      const principal = principalFor(contract.auth, session ?? (options.acceptInvite ? invite : null), invite);
      if (contract.idempotentCommand) {
        const key = CommandHeadersSchema.safeParse({
          "idempotency-key": request.headers.get("idempotency-key") ?? undefined,
        });
        if (!key.success)
          fail("INVALID_INPUT", "Idempotency-Key header is required.", {
            "idempotency-key": ["16-128 URL-safe characters"],
          });
        data = principal
          ? await withReceipt(operation, principal, key.data!["idempotency-key"], input, ctx, handler, options)
          : await handler(ctx);
      } else {
        data = await handler(ctx);
      }
      const body = contract.response.safeParse({ data, correlationId });
      if (!body.success) {
        console.error(`[${correlationId}] ${operation} produced a non-contract response`, body.error.issues.slice(0, 5));
        fail("INTERNAL_ERROR", "The server produced an invalid response.");
      }
      const response = NextResponse.json(body.data, {
        status: contract.status,
        headers: { "cache-control": "no-store" },
      });
      for (const c of ctx.cookies)
        response.cookies.set(c.name, c.value, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production" && !isLocal(request),
          path: "/",
          expires: c.expires,
        });
      return response;
    } catch (error) {
      return errorResponse(error, correlationId, operation);
    }
  };
}

async function readInput<K extends ApiOperation>(contract: Contract<K>, request: NextRequest) {
  let raw: unknown = {};
  if (contract.method === "GET") {
    raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  } else {
    const text = await request.text();
    if (text) {
      try {
        raw = JSON.parse(text);
      } catch {
        fail("INVALID_INPUT", "Body must be JSON.");
      }
    }
  }
  const parsed = contract.input.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues.slice(0, 20)) {
      const path = issue.path.join(".").slice(0, 100) || "_";
      const list = (fieldErrors[path] ??= []);
      if (list.length < 10) list.push(issue.message.slice(0, 120));
    }
    fail("INVALID_INPUT", "Request does not match the contract.", fieldErrors);
  }
  return parsed.data;
}

// Best-effort per-instance limiter for mutations (serverless instances do not share it).
const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(request: NextRequest): void {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    if (buckets.size > 10_000) buckets.clear();
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return;
  }
  if (++bucket.count > 300) fail("RATE_LIMITED", "Too many requests; wait a moment.");
}

function isLocal(request: NextRequest): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname);
}

// Browsers send Origin on cross-site and same-site POSTs; reject foreign origins (CSRF), allow non-browser clients.
function checkOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([request.nextUrl.origin]);
  const host = request.headers.get("host");
  if (host) {
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }
  const app = env().NEXT_PUBLIC_APP_URL;
  if (app) allowed.add(new URL(app).origin);
  if (!allowed.has(origin)) fail("FORBIDDEN", "Cross-origin request rejected.");
}

function authorize(
  auth: Contract<ApiOperation>["auth"],
  request: NextRequest,
  session: SessionRecord | null,
  invite: SessionRecord | null,
): void {
  if (auth === "PUBLIC") return;
  if (auth === "OPERATOR") {
    const secret = env().DISPATCHER_SECRET;
    const header = request.headers.get("authorization");
    if (!secret || header !== `Bearer ${secret}`) fail("UNAUTHENTICATED", "Operator credential required.");
    return;
  }
  if (auth === "INVITATION") {
    if (!invite) fail("UNAUTHENTICATED", "Open the invitation link first.");
    return;
  }
  if (auth === "MEMBER") {
    if (!session && !invite) fail("UNAUTHENTICATED", "Session required.");
    return;
  }
  if (!session) fail("UNAUTHENTICATED", "Session required.");
}

function principalFor(
  auth: Contract<ApiOperation>["auth"],
  session: SessionRecord | null,
  invite: SessionRecord | null,
): SessionRecord | null {
  if (auth === "INVITATION") return invite;
  if (auth === "MEMBER") return session ?? invite;
  if (auth === "PUBLIC" || auth === "OPERATOR") return null;
  return session;
}

// auth+scope (done) -> receipt digest/replay -> handler validates versions/state -> commit with receipt.
async function withReceipt<K extends ApiOperation>(
  operation: K,
  principal: SessionRecord,
  key: string,
  input: unknown,
  ctx: Ctx<K>,
  handler: Handler<K>,
  options: Options<K>,
): Promise<Data<K>> {
  const digest = sha256(JSON.stringify({ params: ctx.params, input }));
  const [mode, showcase] = scopeColumns(principal.scope);
  return transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `${mode}:${showcase}:${principal.principalId}:${operation}:${key}`,
    ]);
    const [existing] = await query<{ payload_digest: string; result: unknown; expires_at: Date }>(
      `SELECT payload_digest, result, expires_at FROM command_receipts
       WHERE scope_mode=$1 AND showcase_id=$2 AND principal_id=$3 AND operation=$4 AND idempotency_key=$5`,
      [mode, showcase, principal.principalId, operation, key],
      tx,
    );
    ctx.tx = tx;
    if (existing && existing.expires_at > new Date()) {
      if (existing.payload_digest !== digest)
        fail("IDEMPOTENCY_CONFLICT", "This key was already used with a different request.");
      return options.replay
        ? options.replay(existing.result, ctx)
        : (existing.result as Data<K>);
    }
    if (existing)
      await tx.query(
        `DELETE FROM command_receipts WHERE scope_mode=$1 AND showcase_id=$2 AND principal_id=$3 AND operation=$4 AND idempotency_key=$5`,
        [mode, showcase, principal.principalId, operation, key],
      );
    const data = await handler(ctx);
    const now = new Date();
    await tx.query(
      `INSERT INTO command_receipts(id, scope_mode, showcase_id, principal_id, operation, idempotency_key, payload_digest, http_status, result, created_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        randomUUID(),
        mode,
        showcase,
        principal.principalId,
        operation,
        key,
        digest,
        apiContracts[operation].status,
        JSON.stringify(options.store ? options.store(data) : data),
        now,
        new Date(now.getTime() + 48 * 3600_000),
      ],
    );
    return data;
  });
}

function errorResponse(error: unknown, correlationId: string, operation: string): Response {
  let failure: ApiFailure;
  if (error instanceof ApiFailure) failure = error;
  else if (error instanceof ConfigurationError)
    failure = new ApiFailure("PROVIDER_UNAVAILABLE", "A required server dependency is not configured.");
  else {
    console.error(`[${correlationId}] ${operation} failed`, error instanceof Error ? error.message : "unknown");
    failure = new ApiFailure("INTERNAL_ERROR", "Unexpected server error.");
  }
  const body = ApiErrorSchema.parse({
    error: {
      code: failure.code,
      message: failure.message.slice(0, 2000),
      retryable: failure.retryable,
      ...(failure.fieldErrors ? { fieldErrors: failure.fieldErrors } : {}),
    },
    correlationId,
  });
  return NextResponse.json(body, {
    status: ERROR_HTTP_STATUS[failure.code],
    headers: { "cache-control": "no-store" },
  });
}

export type { Scope };
