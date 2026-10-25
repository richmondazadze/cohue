"use client";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageFrame } from "@/components/shell/app-shell";

// Generic boundary: no stack traces or URLs are shown (URLs may carry invitation tokens).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageFrame width="reading">
      <div className="workspace-recovery"><p className="eyebrow">Let’s find your way back</p>
      <h1 className="type-experience mt-2">This view could not be shown.</h1>
      <p className="mt-3 text-muted">We could not load this page. Try again, or return home. If you were saving or responding, check its latest status before trying again.</p>
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/" variant="tertiary">
          COHUE home
        </ButtonLink>
      </div>
      </div>
    </PageFrame>
  );
}
