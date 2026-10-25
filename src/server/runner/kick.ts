import "server-only";
import { after } from "next/server";
import { drain } from "./steps";

// Post-response acceleration only. Durable progress comes from the leased job rows plus the worker/scheduler.
export function kick(): void {
  after(async () => {
    try {
      await drain(undefined, 10, 15_000);
    } catch (error) {
      console.error("post-response drain failed", error instanceof Error ? error.message : "unknown");
    }
  });
}
