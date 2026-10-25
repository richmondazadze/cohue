"use client";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageFrame } from "@/components/shell/app-shell";

// Generic boundary: no stack traces or URLs are shown (URLs may carry invitation tokens).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageFrame width="reading">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="type-experience mt-2">This view could not be shown.</h1>
      <p className="mt-3 text-muted">Nothing was confirmed on your behalf. Try again, or go back home.</p>
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/" variant="tertiary">
          COHUE home
        </ButtonLink>
      </div>
    </PageFrame>
  );
}
