import type { NextRequest } from "next/server";
import { route } from "@/server/http/route";
import { mediaFor } from "@/server/domain/media";
import { GUEST_COOKIE, INVITE_COOKIE, resolveSession } from "@/server/auth/sessions";

const metadata = route("media", async (ctx) => (await mediaFor((ctx.session ?? ctx.invite)!, ctx.params.id)).doc, { acceptInvite: true });

// JSON Accept returns metadata; audio Accept returns bytes after the same owner/scope/expiry check.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(request.headers.get("accept") ?? "").includes("audio/")) return metadata(request, context);
  const principal =
    (await resolveSession(request.cookies.get(GUEST_COOKIE)?.value)) ??
    (await resolveSession(request.cookies.get(INVITE_COOKIE)?.value));
  const { id } = await context.params;
  const media = principal ? await mediaFor(principal, id).catch(() => null) : null;
  if (!media) return metadata(request, context);
  return new Response(new Uint8Array(media.bytes), { headers: { "content-type": media.mimeType, "cache-control": "no-store" } });
}
