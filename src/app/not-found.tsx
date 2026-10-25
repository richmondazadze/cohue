import { ButtonLink } from "@/components/ui/button";
import { PageFrame } from "@/components/shell/app-shell";

export default function NotFound() {
  return (
    <PageFrame width="reading">
      <div className="workspace-recovery"><p className="eyebrow">404 · A different direction</p>
      <h1 className="type-experience mt-2">This page does not exist.</h1>
      <p className="mt-3 text-muted">The link may be incomplete or out of date.</p>
      <ButtonLink href="/" variant="primary" className="mt-6">
        Go to COHUE home
      </ButtonLink>
      </div>
    </PageFrame>
  );
}
