import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/config/env";
import { drain } from "@/server/runner/steps";

// Operational scheduler/worker entry (not a public product API): bounded leased-job drain.
export async function POST(request: NextRequest) {
  const secret = env().DISPATCHER_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || header.length !== expected.length || !timingSafeEqual(Buffer.from(header), Buffer.from(expected)))
    return NextResponse.json({ ok: false }, { status: 401, headers: { "cache-control": "no-store" } });
  const processed = await drain(undefined, 25, 20_000);
  return NextResponse.json({ ok: true, processed }, { headers: { "cache-control": "no-store" } });
}
export const GET = POST;
