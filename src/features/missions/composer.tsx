"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CreateMissionSchema, type ApiInput } from "@/contracts";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Panel, Skeleton } from "@/components/ui/surface";
import { StatusBadge } from "@/components/ui/status";
import { cx } from "@/components/ui/cx";
import { useCommand } from "@/client/command";
import { ensureLiveSession, keys, useDeviceMemory, useTaxonomy, useSession } from "@/client/queries";
import { prepareShowcaseProfile } from "@/client/showcase";
import type { ApiData } from "@/client/http";
import { rememberMission } from "@/client/local";
import { formatInterval } from "@/client/time";
import { useHydrated } from "@/client/hydrated";
import {
  IntervalRow,
  draftFromInterval,
  intervalFromDraft,
  newIntervalDraft,
  type IntervalDraft,
} from "@/features/shared/availability";
import { QuickIdentity } from "@/features/participants/quick-identity";
import { CoordinatorChat, type CoordinatorDraft } from "@/features/missions/coordinator";
import { LANGUAGES, skillHint, skillLabel, type TaxonomySkill } from "@/features/shared/skills";

type Req = ApiInput<"createMission">["requirements"][number] & { key: string };
type Draft = {
  objective: string;
  expectedOutput: string;
  language: string;
  requirements: Req[];
  minGroupSize: number;
  maxGroupSize: number;
  minOverlapMinutes: number;
  window: IntervalDraft;
  creatorParticipates: boolean;
  preferences: string[];
};

const newReq = (skill?: TaxonomySkill): Req => ({
  key: globalThis.crypto.randomUUID(),
  kind: "HUMAN",
  normalizedSkillId: skill?.id ?? "",
  category: skill?.category ?? "",
  priority: "REQUIRED",
  minimumCoverage: 1,
  minimumLevel: null,
  outcome: null,
});

function buildInput(d: Draft) {
  const win = intervalFromDraft(d.window);
  const input = {
    objective: d.objective.trim(),
    expectedOutput: d.expectedOutput.trim(),
    language: d.language,
    constraints: {
      minGroupSize: d.minGroupSize,
      maxGroupSize: d.maxGroupSize,
      minOverlapMinutes: d.minOverlapMinutes,
      window: win.ok ? win.value : { start: "", end: "", timezone: d.window.timezone },
      creatorParticipates: d.creatorParticipates,
      preferences: d.preferences,
    },
    requirements: d.requirements.map(({ key: _key, ...r }) => {
      void _key;
      return r;
    }),
  };
  const parsed = CreateMissionSchema.safeParse(input);
  const errors: Record<string, string> = {};
  if (!win.ok) errors["constraints.window"] = win.error;
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".");
      if (k.startsWith("constraints.window") && !win.ok) continue;
      errors[k] ??= humanize(k, issue.message);
    }
  if (!d.requirements.length) errors.requirements = "Add at least one requirement.";
  return { input, errors, valid: Object.keys(errors).length === 0 };
}

function humanize(path: string, message: string) {
  if (path === "objective") return "Describe the objective.";
  if (path === "expectedOutput") return "Describe the expected output.";
  if (/requirements\.\d+\.normalizedSkillId/.test(path)) return "Choose a skill for this requirement.";
  if (/requirements\.\d+\.category/.test(path)) return "Choose a skill for this requirement.";
  if (/requirements\.\d+\.outcome/.test(path)) return "Outcome must be 1–2000 characters or empty.";
  return message;
}

export function Composer() {
  const hydrated = useHydrated();
  const taxonomy = useTaxonomy();
  if (!hydrated || taxonomy.isPending)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" label="Loading composer" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (taxonomy.isError)
    return <ErrorNotice error={taxonomy.error} title="Skill list unavailable" onRetry={() => void taxonomy.refetch()} />;
  return <ComposerForm skills={taxonomy.data.skills} />;
}

function ComposerForm({ skills }: { skills: TaxonomySkill[] }) {
  const router = useRouter();
  const client = useQueryClient();
  const memory = useDeviceMemory();
  const session = useSession();
  const inShowcase = session.data?.kind === "SHOWCASE_OPERATOR";
  const [preparingShowcase, setPreparingShowcase] = useState(false);
  const [phase, setPhase] = useState<"compose" | "review">("compose");
  const [showErrors, setShowErrors] = useState(false);
  const [sessionError, setSessionError] = useState<unknown>(null);
  const [created, setCreated] = useState<{ id: string; version: number } | null>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<Draft>(() => ({
    objective: "",
    expectedOutput: "",
    language: ["en", "es", "fr"].find((l) => navigator.language?.startsWith(l)) ?? "en",
    requirements: [newReq()],
    minGroupSize: 2,
    maxGroupSize: 4,
    minOverlapMinutes: 60,
    window: { ...newIntervalDraft(1, "09:00", "21:00") },
    creatorParticipates: false,
    preferences: [],
  }));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setReq = (key: string, patch: Partial<Req>) =>
    set({ requirements: draft.requirements.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

  const createMission = useCommand("createMission");
  const startMission = useCommand("startMission");
  const { input, errors, valid } = buildInput(draft);
  const err = (k: string) => (showErrors ? errors[k] : undefined);

  const withSession = async (fn: (session: ApiData<"getSession">) => void) => {
    setSessionError(null);
    try {
      const currentSession = await ensureLiveSession(client);
      fn(currentSession);
    } catch (e) {
      setSessionError(e);
    }
  };

  // Which fields the latest Coordinator turn filled, so each can visibly settle in, in order.
  const [fill, setFill] = useState<{ wave: number; keys: string[] }>({ wave: 0, keys: [] });
  const fillAttr = (key: string, offset = 0) => {
    const i = fill.keys.indexOf(key);
    return i < 0 || !fill.wave
      ? {}
      : { "data-fill": fill.wave % 2 ? "a" : "b", style: { "--fill-i": i + offset } as React.CSSProperties };
  };
  // The Coordinator's draft fills the form; creator participation is never inferred from text.
  const applyDraft = (x: CoordinatorDraft) => {
    const c = x.constraintsDraft;
    const keys = [
      "objective",
      ...(x.expectedOutput ? ["expectedOutput"] : []),
      ...(x.requirements.length ? ["requirements"] : []),
      ...(c.minGroupSize || c.maxGroupSize || c.minOverlapMinutes ? ["group"] : []),
    ];
    setFill((f) => ({ wave: f.wave + 1, keys }));
    setDraft((d) => ({
      ...d,
      objective: x.objective,
      expectedOutput: x.expectedOutput ?? d.expectedOutput,
      requirements: x.requirements.length
        ? x.requirements.map((r) => ({ ...r, key: globalThis.crypto.randomUUID() }))
        : d.requirements,
      minGroupSize: x.constraintsDraft.minGroupSize ?? d.minGroupSize,
      maxGroupSize: x.constraintsDraft.maxGroupSize ?? d.maxGroupSize,
      minOverlapMinutes: x.constraintsDraft.minOverlapMinutes ?? d.minOverlapMinutes,
      window: x.constraintsDraft.window ? draftFromInterval(x.constraintsDraft.window) : d.window,
      preferences: x.constraintsDraft.preferences ?? d.preferences,
    }));
  };
  const coordinatorSession = async () => {
    setSessionError(null);
    try {
      await ensureLiveSession(client);
      return true;
    } catch (e) {
      setSessionError(e);
      return false;
    }
  };

  const toReview = () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    setPhase("review");
    requestAnimationFrame(() => reviewRef.current?.focus());
  };

  // The Coordinator advances on a timer, after the draft it just applied has rendered; always use the latest form.
  const latestToReview = useRef(toReview);
  useEffect(() => {
    latestToReview.current = toReview;
  });

  const launch = () =>
    withSession((currentSession) => {
      const start = (m: { id: string; version: number }) =>
        startMission.mutate(
          { params: { id: m.id }, input: { expectedVersion: m.version } },
          { onSuccess: () => router.push(`/missions/${m.id}`) },
        );
      if (created) return start(created);
      createMission.mutate(
        { input: CreateMissionSchema.parse(input) },
        {
          onSuccess: (mission) => {
            rememberMission(mission, currentSession);
            const ref = { id: mission.id, version: mission.version };
            setCreated(ref);
            client.removeQueries({ queryKey: keys.snapshot(mission.id) });
            start(ref);
          },
        },
      );
    });

  if (phase === "review")
    return (
      <div className="composer-review grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <h2 ref={reviewRef} tabIndex={-1} className="type-section outline-none">
            Review before discovery
          </h2>
          <p className="mt-2 text-muted">
            Starting discovery saves this brief and asks COHUE to search people who opted in. It does not invite anyone.
          </p>
          <dl className="mt-6 rounded-panel border border-line-panel bg-surface px-5">
            <KeyValue label="Objective">{input.objective}</KeyValue>
            <KeyValue label="Expected output">{input.expectedOutput}</KeyValue>
            <KeyValue label="Language">{LANGUAGES.find((l) => l.value === input.language)?.label}</KeyValue>
            <KeyValue label="Group size">
              {input.constraints.minGroupSize}–{input.constraints.maxGroupSize} people
            </KeyValue>
            <KeyValue label="Common time">at least {input.constraints.minOverlapMinutes} minutes together</KeyValue>
            <KeyValue label="Window">{formatInterval(input.constraints.window)}</KeyValue>
            <KeyValue label="You take part">{input.constraints.creatorParticipates ? "Yes, as a member" : "No, organizing only"}</KeyValue>
          </dl>
          <h3 className="type-panel mt-6 mb-2">Requirements</h3>
          <ul className="divide-y divide-line-subtle rounded-panel border border-line-panel bg-surface">
            {input.requirements.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span className="font-medium">{skillLabel(r.normalizedSkillId)}</span>
                <span className="type-meta text-muted">
                  {r.kind === "HUMAN" ? "Person" : "Resource"} · {r.priority === "REQUIRED" ? "Required" : "Optional"} ·{" "}
                  {r.minimumCoverage} needed{r.minimumLevel ? ` · level ≥ ${r.minimumLevel}` : ""}
                </span>
              </li>
            ))}
          </ul>
          {createMission.isError ? <ErrorNotice className="mt-6" error={createMission.error} title="Mission not saved" /> : null}
          {created && startMission.isError ? (
            <ErrorNotice
              className="mt-6"
              error={startMission.error}
              title="Saved as a draft, but discovery did not start"
              onRetry={launch}
            />
          ) : null}
          {sessionError ? <ErrorNotice className="mt-6" error={sessionError} title="Could not start a session" /> : null}
          <div className="safe-bottom sticky bottom-0 -mx-4 mt-8 flex flex-col gap-3 border-t border-line-subtle bg-canvas px-4 pt-4 sm:flex-row md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
            <Button onClick={() => setPhase("compose")} disabled={Boolean(created)}>
              Edit brief
            </Button>
            <Button
              variant="primary"
              onClick={launch}
              pending={createMission.isPending || startMission.isPending}
              pendingLabel={createMission.isPending ? "Saving mission…" : "Starting discovery…"}
              className="sm:min-w-[240px]"
            >
              {created ? "Retry starting discovery" : "Start discovery"}
            </Button>
            {created ? (
              <Button variant="tertiary" onClick={() => router.push(`/missions/${created.id}`)}>
                Open saved draft
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );

  return (
    <div className="composer-workspace grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-8">
        {!memory.participantId ? (
          <Notice tone="pending" title={inShowcase ? "Choose the synthetic organizer" : "Who's organizing?"}>
            {inShowcase ? <>
              This installed showcase uses a synthetic organizer. It runs real matching and commands; no real person is enrolled or approves anything.
              <Button className="mt-3" size="sm" pending={preparingShowcase} pendingLabel="Checking synthetic profile…" onClick={async () => {
                if (!session.data) return;
                setPreparingShowcase(true);
                setSessionError(null);
                try { await prepareShowcaseProfile(session.data); } catch (e) { setSessionError(e); }
                finally { setPreparingShowcase(false); }
              }}>Use synthetic organizer profile</Button>
            </> : <QuickIdentity language={draft.language} />}
          </Notice>
        ) : null}
        {/* Until someone says who is organizing, the conversation and brief are visible but locked. */}
        <div
          className={cx("composer-lockable flex min-w-0 flex-col gap-8", !memory.participantId && "is-locked")}
          inert={!memory.participantId}
          aria-disabled={!memory.participantId || undefined}
        >
        <Panel className="p-5 md:p-6">
          <CoordinatorChat
            language={draft.language}
            ensureSession={coordinatorSession}
            onDraft={applyDraft}
            onReady={() => latestToReview.current()}
          />
          {sessionError ? <ErrorNotice className="mt-4" error={sessionError} title="Could not start a session" /> : null}
        </Panel>

        <section className="flex flex-col gap-5" aria-labelledby="brief-h">
          <h2 id="brief-h" className="type-section">Brief</h2>
          <div {...fillAttr("objective")} className="fill-target">
          <Field label="Objective" error={err("objective")}>
            {(f) => (
              <TextArea id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} rows={2} maxLength={2000}
                value={draft.objective} onChange={(e) => set({ objective: e.target.value })} />
            )}
          </Field>
          </div>
          <div {...fillAttr("expectedOutput")} className="fill-target">
          <Field label="Expected output" helper="What exists when the mission succeeds?" error={err("expectedOutput")}>
            {(f) => (
              <TextArea id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} rows={2} maxLength={2000}
                value={draft.expectedOutput} onChange={(e) => set({ expectedOutput: e.target.value })} />
            )}
          </Field>
          </div>
          <Field label="Mission language" className="max-w-xs">
            {(f) => (
              <Select id={f.id} value={draft.language} onChange={(e) => set({ language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="req-h">
          <div>
            <h2 id="req-h" className="type-section">Requirements</h2>
            <p className="mt-1 text-sm text-muted">Each row is a capability the group must cover. Coverage is feasibility, not consent.</p>
          </div>
          {err("requirements") ? <p className="type-meta font-medium text-declined">− {err("requirements")}</p> : null}
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {draft.requirements.map((r, i) => (
              <li key={r.key} className="fill-target rounded-field border border-line-panel bg-surface p-4" {...fillAttr("requirements", i)}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="type-compact">Requirement {i + 1}</span>
                  {draft.requirements.length > 1 ? (
                    <Button size="sm" variant="tertiary" onClick={() => set({ requirements: draft.requirements.filter((x) => x.key !== r.key) })}>
                      Remove
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Skill" error={err(`requirements.${i}.normalizedSkillId`) ?? err(`requirements.${i}.category`)}>
                    {(f) => (
                      <Select id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} value={r.normalizedSkillId}
                        onChange={(e) => {
                          const s = skills.find((x) => x.id === e.target.value);
                          setReq(r.key, { normalizedSkillId: s?.id ?? "", category: s?.category ?? "" });
                        }}>
                        <option value="">Choose a skill</option>
                        {skills.map((s) => (
                          <option key={s.id} value={s.id}>{skillLabel(s.id)} — {skillHint(s, draft.language)}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="Filled by">
                    {(f) => (
                      <Select id={f.id} value={r.kind} onChange={(e) => setReq(r.key, { kind: e.target.value as Req["kind"] })}>
                        <option value="HUMAN">A person</option>
                        <option value="RESOURCE">A public resource</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="Priority">
                    {(f) => (
                      <Select id={f.id} value={r.priority} onChange={(e) => setReq(r.key, { priority: e.target.value as Req["priority"] })}>
                        <option value="REQUIRED">Required</option>
                        <option value="OPTIONAL">Optional</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="People needed">
                    {(f) => (
                      <Select id={f.id} value={r.minimumCoverage} onChange={(e) => setReq(r.key, { minimumCoverage: Number(e.target.value) })}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    )}
                  </Field>
                  <Field label="Minimum level">
                    {(f) => (
                      <Select id={f.id} value={r.minimumLevel ?? ""} onChange={(e) => setReq(r.key, { minimumLevel: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Any level</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Level {n}+</option>)}
                      </Select>
                    )}
                  </Field>
                  <Field label="Outcome" optional error={err(`requirements.${i}.outcome`)}>
                    {(f) => (
                      <TextInput id={f.id} value={r.outcome ?? ""} maxLength={2000}
                        onChange={(e) => setReq(r.key, { outcome: e.target.value.trim() ? e.target.value : null })} />
                    )}
                  </Field>
                </div>
              </li>
            ))}
          </ol>
          {draft.requirements.length < 30 ? (
            <Button size="sm" className="self-start" onClick={() => set({ requirements: [...draft.requirements, newReq()] })}>
              Add requirement
            </Button>
          ) : null}
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="constraints-h">
          <h2 id="constraints-h" className="type-section">Time and group</h2>
          <div className="fill-target grid gap-3 sm:grid-cols-3" {...fillAttr("group", draft.requirements.length)}>
            <Field label="Smallest group" error={err("constraints.minGroupSize")}>
              {(f) => (
                <Select id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} value={draft.minGroupSize} onChange={(e) => set({ minGroupSize: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Largest group">
              {(f) => (
                <Select id={f.id} value={draft.maxGroupSize} onChange={(e) => set({ maxGroupSize: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Time together (minutes)" error={err("constraints.minOverlapMinutes")}>
              {(f) => (
                <TextInput id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} type="number" inputMode="numeric" min={1} max={1440}
                  value={draft.minOverlapMinutes}
                  onChange={(e) => set({ minOverlapMinutes: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
              )}
            </Field>
          </div>
          <IntervalRow
            legend="Mission window"
            allowMultiDay
            value={draft.window}
            error={err("constraints.window")}
            onChange={(window) => set({ window })}
          />
          <div className="rounded-field bg-subtle p-4">
            <Checkbox
              checked={draft.creatorParticipates}
              onCheckedChange={(v) => set({ creatorParticipates: v })}
              label="I will take part as a member"
              description={
                memory.participantId
                  ? "Your own profile and availability count toward the group."
                  : "Requires your participant profile on this device. Join first if you want to take part."
              }
            />
          </div>
        </section>

        <div className="safe-bottom sticky bottom-0 z-10 -mx-4 flex gap-3 border-t border-line-subtle bg-canvas px-4 pt-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
          <Button variant="primary" onClick={toReview} className="flex-1 md:flex-none md:min-w-[240px]">
            Review requirements
          </Button>
        </div>
        {showErrors && !valid ? (
          <Notice tone="declined" role="alert" title="Some details need attention">
            <ul className="list-disc pl-5">
              {[...new Set(Object.values(errors))].map((e) => <li key={e}>{e}</li>)}
            </ul>
          </Notice>
        ) : null}
        </div>
      </div>
      <aside aria-label="Brief summary" className="hidden lg:block">
        <Panel className="sticky top-28 p-6">
          <p className="eyebrow">Live summary</p>
          <p className="type-panel mt-3">{draft.objective || <span className="text-muted">Objective not set</span>}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {draft.requirements.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-2 border-t border-line-subtle pt-2 text-sm">
                <span>{r.normalizedSkillId ? skillLabel(r.normalizedSkillId) : <span className="text-muted">Unchosen skill</span>}</span>
                <StatusBadge tone={r.priority === "REQUIRED" ? "action" : "neutral"}>
                  {r.priority === "REQUIRED" ? "Required" : "Optional"}
                </StatusBadge>
              </li>
            ))}
          </ul>
          <p className={cx("type-meta mt-4", valid ? "text-approved" : "text-muted")}>
            {valid ? "✓ Ready to review" : `${Object.keys(errors).length} item(s) to complete`}
          </p>
        </Panel>
      </aside>
    </div>
  );
}
