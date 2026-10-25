"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { prepareShowcaseProfile, SHOWCASE_ID } from "@/client/showcase";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/surface";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/ui/notice";
import { useCommand } from "@/client/command";
import { keys, useDeviceMemory, useSession } from "@/client/queries";
import { formatTimestamp } from "@/client/time";
import { gsap, ScrollTrigger, useGSAP } from "@/client/gsap";

const STEPS = [
  {
    n: "01",
    title: "Discover",
    body: "Describe what you want to make. Review the skills, time and group size it needs before anything starts.",
  },
  {
    n: "02",
    title: "Coordinate",
    body: "COHUE searches people who opted in, and explains every proposed group: coverage, overlap and why.",
  },
  {
    n: "03",
    title: "Make",
    body: "Each person reads the full terms and decides. The Mission Room opens only when everyone required has agreed.",
  },
];

export function Entry() {
  const memory = useDeviceMemory();
  const session = useSession();
  const mainRef = useRef<HTMLElement>(null);
  const inShowcase = session.data?.scope.executionMode === "SHOWCASE";
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ reduce: "(prefers-reduced-motion: reduce)" }, (context) => {
        if (context.conditions?.reduce) return;
        gsap.from("[data-rise='hero']", {
          autoAlpha: 0,
          y: 8,

          transformOrigin: "50% 100%",
          stagger: 0.07,
          duration: 0.28,
          clearProps: "transform,opacity,visibility",
        });
        ScrollTrigger.batch("[data-rise='step']", {
          start: "top 90%",
          once: true,
          onEnter: (batch) => {
            gsap.from(batch, {
              autoAlpha: 0,
              y: 8,

              transformOrigin: "50% 100%",
              stagger: 0.08,
              duration: 0.28,
              clearProps: "transform,opacity,visibility",
            });
          },
        });
      });
      return () => mm.revert();
    },
    { scope: mainRef },
  );
  return (
    <main id="main" ref={mainRef} data-stage="hero" tabIndex={-1} className="outline-none">
      <section className="workspace-entry-hero gutter mx-auto max-w-[1600px] pt-12 pb-12 md:pt-20">
        <p data-rise="hero" className="eyebrow mb-6 inline-flex items-center gap-3">
          <span aria-hidden="true" className="block h-px w-7 bg-line-control" />
          Common ground
        </p>
        <h1 data-rise="hero" className="type-entry mx-auto max-w-[18ch]">
          What could we{" "}
          <span className="text-muted">make happen together?</span>
        </h1>
        <p data-rise="hero" className="mx-auto mt-6 max-w-[60ch] text-ink">
          From strangers to something extraordinary. A living map of what people
          can accomplish together, with every commitment made by a human.
        </p>
        <div data-rise="hero" className="mx-auto mt-8 flex max-w-[640px] flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/missions/new" variant="primary" className="sm:min-w-[200px]">
            Start a mission
          </ButtonLink>
          <ButtonLink
            href={memory.participantId ? "/me" : "/join"}
            variant="secondary"
            className="sm:min-w-[200px]"
          >
            {memory.participantId ? "My profile & invitations" : "Join the network"}
          </ButtonLink>
        </div>
        <p data-rise="hero" className="type-meta mx-auto mt-4 max-w-[52ch] text-muted">
          {inShowcase
            ? "Synthetic showcase. Explore the same matching and consent workflow with clearly labeled synthetic profiles."
            : "Live mode. Real people, real availability, real decisions. Nobody is added to a team without saying yes."}
        </p>
        <ShowcaseEntry />
      </section>

      <section
        aria-label="How COHUE works"
        className="gutter mx-auto grid max-w-[1600px] gap-6 border-t border-line-subtle pt-10 pb-12 md:grid-cols-3"
      >
        {STEPS.map((s) => (
          <article key={s.n} data-rise="step" data-tilt className="border-t border-line-control pt-4">
            <span className="text-3xl font-normal text-muted tabular">{s.n}</span>
            <h2 className="type-section mt-2">{s.title}</h2>
            <p className="mt-2 max-w-[44ch] text-sm leading-5 text-muted">{s.body}</p>
          </article>
        ))}
      </section>

      {memory.missions.length ? (
        <section data-rise="step" className="gutter mx-auto max-w-[1600px] pb-24" aria-labelledby="your-missions">
          <h2 id="your-missions" className="type-section mb-4">
            Missions started on this device
          </h2>
          <Panel as="div" data-tilt className="divide-y divide-line-subtle">
            {memory.missions.map((m) => (
              <Link
                key={m.id}
                href={`/missions/${m.id}`}
                className="flex min-h-14 flex-col justify-center gap-0.5 px-5 py-3 no-underline hover:bg-subtle sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{m.objective}</span>
                <span className="type-meta text-muted">
                  {formatTimestamp(m.createdAt)} · Open theater →
                </span>
              </Link>
            ))}
          </Panel>
        </section>
      ) : (
        <div className="pb-16" />
      )}
    </main>
  );
}

export { SHOWCASE_ID } from "@/client/showcase";

/** Clearly separated, opt-in synthetic scope. It runs the same real commands against synthetic people. */
function ShowcaseEntry() {
  const router = useRouter();
  const client = useQueryClient();
  const session = useSession();
  const create = useCommand("createSession");
  const [preparing, setPreparing] = useState(false);
  const [setupError, setSetupError] = useState<unknown>(null);
  const inShowcase = session.data?.scope.executionMode === "SHOWCASE";
  return (
    <div data-rise="hero" data-tilt className="mx-auto mt-8 flex max-w-[560px] flex-col items-center gap-2 rounded-panel border border-dashed border-pending bg-pending-bg/60 px-5 py-4">
      <p className="text-sm text-pending">
        <strong>Synthetic showcase.</strong> 30 synthetic people, clearly labelled. Real matching and commands, no real people or commitments.
      </p>
      <Button
        size="sm"
        pending={create.isPending || preparing}
        pendingLabel="Opening showcase…"
        onClick={async () => {
          setSetupError(null);
          setPreparing(true);
          try {
            const current = inShowcase && session.data ? session.data : await create.mutateAsync({ input: { executionMode: "SHOWCASE", showcaseId: SHOWCASE_ID } });
            client.clear();
            client.setQueryData(keys.session, current);
            await prepareShowcaseProfile(current);
            router.push("/missions/new");
          } catch (error) { setSetupError(error); }
          finally { setPreparing(false); }
        }}
      >
        {inShowcase ? "Continue in the showcase" : "Explore the synthetic showcase"}
      </Button>
      {setupError ? <ErrorNotice error={setupError} title="Showcase unavailable" /> : null}
    </div>
  );
}
