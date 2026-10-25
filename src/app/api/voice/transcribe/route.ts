import { route } from "@/server/http/route";
import { transcribe } from "@/server/domain/media";

// Multipart `audio` + JSON `metadata`; transcript is a reviewable draft and never a response or consent.
export const POST = route("transcribe", (ctx) => transcribe(ctx.file, ctx.input), { multipart: true, acceptInvite: true });
