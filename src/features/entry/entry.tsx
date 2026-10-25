"use client";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/surface";
import { useDeviceMemory } from "@/client/queries";
import { formatTimestamp } from "@/client/time";

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
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <section className="gutter mx-auto max-w-[1600px] pt-12 pb-12 text-center md:pt-20">
        <p className="eyebrow mb-6 inline-flex items-center gap-3">
          <span aria-hidden="true" className="block h-px w-7 bg-line-control" />
          Common ground
        </p>
        <h1 className="type-entry mx-auto max-w-[18ch]">
          What could we{" "}
          <span className="text-muted">make happen together?</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[60ch] text-ink">
          From strangers to something extraordinary. A living map of what people
          can accomplish together, with every commitment made by a human.
        </p>
        <div className="mx-auto mt-8 flex max-w-[640px] flex-col gap-3 sm:flex-row sm:justify-center">
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
        <p className="type-meta mx-auto mt-4 max-w-[52ch] text-muted">
          Live mode. Real people, real availability, real decisions. Nobody is
          added to a team without saying yes.
        </p>
      </section>

      <section
        aria-label="How COHUE works"
        className="gutter mx-auto grid max-w-[1600px] gap-6 border-t border-line-subtle pt-10 pb-12 md:grid-cols-3"
      >
        {STEPS.map((s) => (
          <article key={s.n} className="border-t border-line-control pt-4">
            <span className="text-3xl font-normal text-muted tabular">{s.n}</span>
            <h2 className="type-section mt-2">{s.title}</h2>
            <p className="mt-2 max-w-[44ch] text-sm leading-5 text-muted">{s.body}</p>
          </article>
        ))}
      </section>

      {memory.missions.length ? (
        <section className="gutter mx-auto max-w-[1600px] pb-24" aria-labelledby="your-missions">
          <h2 id="your-missions" className="type-section mb-4">
            Missions started on this device
          </h2>
          <Panel as="div" className="divide-y divide-line-subtle">
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
