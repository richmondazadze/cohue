import type { NextRequest } from "next/server";
import { AgentEventSchema } from "@/contracts";
import { route } from "@/server/http/route";
import { eventsPage, loadOwnedMission } from "@/server/domain/missions/service";
import { GUEST_COOKIE, resolveSession } from "@/server/auth/sessions";
import { scopeFromRow } from "@/server/http/scope";

const json = route("events", async (ctx) => {
  const mission = await loadOwnedMission(ctx.params.id, ctx.session!);
  return eventsPage(scopeFromRow(mission), mission.id, ctx.input.after, ctx.input.limit);
});

// SSE transport exception: frames are bare validated AgentEvents with id=sequence; heartbeats are comments.
// Auth, scope and input errors fall through to the JSON handler so they use the ApiError envelope.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.nextUrl.searchParams.get("format") !== "sse") return json(request, context);
  const { id } = await context.params;
  const token = request.cookies.get(GUEST_COOKIE)?.value;
  const session = await resolveSession(token);
  if (!session) return json(request, context);
  const mission = await loadOwnedMission(id, session).catch(() => null);
  if (!mission) return json(request, context);
  const lastId = request.headers.get("last-event-id");
  const afterParam = request.nextUrl.searchParams.get("after");
  if (lastId && afterParam && lastId !== afterParam) return json(request, context);
  let cursor = Number(lastId ?? afterParam ?? 0) || 0;
  const scope = scopeFromRow(mission);
  const encoder = new TextEncoder();
  const started = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      let lastAuth = Date.now();
      let lastBeat = Date.now();
      try {
        controller.enqueue(encoder.encode("retry: 2000\n\n"));
        while (Date.now() - started < 55_000 && !request.signal.aborted) {
          if (Date.now() - lastAuth > 15_000) {
            if (!(await resolveSession(token))) break;
            lastAuth = Date.now();
          }
          const page = await eventsPage(scope, id, cursor, 100);
          for (const event of page.events) {
            const safe = AgentEventSchema.parse(event);
            controller.enqueue(encoder.encode(`id: ${safe.sequence}\nevent: mission\ndata: ${JSON.stringify(safe)}\n\n`));
            cursor = safe.sequence;
          }
          if (Date.now() - lastBeat > 15_000) {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
            lastBeat = Date.now();
          }
          if (!page.hasMore) await new Promise((r) => setTimeout(r, 1000));
        }
      } catch {
        // Client disconnects end the stream; the client reconnects with Last-Event-ID.
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" },
  });
}
