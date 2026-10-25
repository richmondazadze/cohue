import { route } from "@/server/http/route";
import { speakCoordinator } from "@/server/domain/extraction";

// Fetched after the text turn renders, so the conversation never waits on voice.
export const POST = route("speakCoordinator", (ctx) => speakCoordinator(ctx.session!.principalId, ctx.input.speech));
