"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ApiInput } from "@/contracts";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { RecordControl } from "@/components/voice/record-control";
import { ErrorNotice, Notice } from "@/components/ui/notice";
import { KeyValue, Panel, Skeleton } from "@/components/ui/surface";
import { cx } from "@/components/ui/cx";
import { useCommand } from "@/client/command";
import { ensureLiveSession, keys, useTaxonomy } from "@/client/queries";
import { writeDeviceMemory } from "@/client/local";
import { formatInterval } from "@/client/time";
import { useHydrated } from "@/client/hydrated";
import {
  IntervalRow,
  draftFromInterval,
  intervalFromDraft,
  newIntervalDraft,
  type IntervalDraft,
} from "@/features/shared/availability";
import {
  LANGUAGES,
  skillHint,
  skillLabel,
  type TaxonomySkill,
} from "@/features/shared/skills";

type Offered = { level: number | null; evidence: string };
type Draft = {
  displayName: string;
  language: string;
  offered: Record<string, Offered>;
  confirmSkills: boolean;
  needs: string[];
  interests: string[];
  availability: IntervalDraft[];
  publicGraph: boolean;
  discoverable: boolean;
  participationOptIn: boolean;
};

const STEPS = ["About you", "Skills & needs", "Time & visibility", "Review"] as const;

function validate(d: Draft) {
  const errors: Record<string, string> = {};
  if (!d.displayName.trim()) errors.displayName = "Enter the name others will see.";
  else if (d.displayName.trim().length > 120) errors.displayName = "Keep it under 120 characters.";
  if (Object.keys(d.offered).length && !d.confirmSkills)
    errors.confirmSkills = "Confirm the skills you offer before saving.";
  d.availability.forEach((a) => {
    const r = intervalFromDraft(a);
    if (!r.ok) errors[`availability.${a.key}`] = r.error;
  });
  return errors;
}

function toInput(d: Draft, taxonomy: TaxonomySkill[]): ApiInput<"createParticipant"> {
  return {
    displayName: d.displayName.trim(),
    language: d.language,
    needs: d.needs,
    interests: d.interests,
    availability: d.availability.flatMap((a) => {
      const r = intervalFromDraft(a);
      return r.ok ? [r.value] : [];
    }),
    capabilities: Object.entries(d.offered).map(([id, o]) => ({
      normalizedSkillId: id,
      category: taxonomy.find((s) => s.id === id)?.category ?? "general",
      level: o.level,
      evidence: o.evidence.trim() ? o.evidence.trim() : null,
      confirmedByUser: true as const,
      normalizationVersion: "taxonomy-1" as const,
    })),
    visibility: { publicGraph: d.publicGraph, discoverable: d.discoverable },
    participationOptIn: d.participationOptIn,
  };
}

function ToggleChips({
  options,
  selected,
  onChange,
  label,
}: {
  options: TaxonomySkill[];
  selected: string[];
  onChange: (next: string[]) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((s) => {
        const on = selected.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? selected.filter((x) => x !== s.id) : [...selected, s.id])
            }
            className={cx(
              "press inline-flex min-h-11 items-center gap-1.5 rounded-button border px-4 text-sm font-medium",
              on
                ? "border-action bg-selected text-action"
                : "border-line-control bg-surface text-ink hover:bg-hover",
            )}
          >
            <span aria-hidden="true">{on ? "✓" : "+"}</span>
            {skillLabel(s.id)}
          </button>
        );
      })}
    </div>
  );
}

export function Onboarding() {
  const hydrated = useHydrated();
  const taxonomy = useTaxonomy();
  if (!hydrated || taxonomy.isPending)
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-2/3" label="Loading onboarding" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (taxonomy.isError)
    return (
      <ErrorNotice
        error={taxonomy.error}
        title="Skill list unavailable"
        onRetry={() => void taxonomy.refetch()}
      />
    );
  return <OnboardingForm skills={taxonomy.data.skills} />;
}

function OnboardingForm({ skills }: { skills: TaxonomySkill[] }) {
  const router = useRouter();
  const client = useQueryClient();
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [sessionError, setSessionError] = useState<unknown>(null);
  const [preparing, setPreparing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<Draft>(() => ({
    displayName: "",
    language: (["en", "es", "fr"].find((l) => navigator.language?.startsWith(l)) ?? "en"),
    offered: {},
    confirmSkills: false,
    needs: [],
    interests: [],
    availability: [newIntervalDraft(1)],
    publicGraph: false,
    discoverable: false,
    participationOptIn: false,
  }));
  const create = useCommand("createParticipant");
  const parse = useCommand("parseProfile");
  const [about, setAbout] = useState("");
  const [unknowns, setUnknowns] = useState<string[] | null>(null);
  const known = new Set(skills.map((x) => x.id));
  const runParse = async () => {
    setSessionError(null);
    try {
      await ensureLiveSession(client);
    } catch (e) {
      setSessionError(e);
      return;
    }
    parse.mutate(
      { input: { text: about.trim(), language: draft.language } },
      {
        onSuccess: (x) => {
          setUnknowns(x.unknowns);
          setDraft((d) => ({
            ...d,
            displayName: d.displayName || x.profile.displayName || "",
            language: x.profile.language && ["en", "es", "fr"].includes(x.profile.language) ? x.profile.language : d.language,
            needs: x.profile.needs?.filter((n) => known.has(n)) ?? d.needs,
            interests: x.profile.interests?.filter((n) => known.has(n)) ?? d.interests,
            availability: x.profile.availability?.length ? x.profile.availability.map(draftFromInterval) : d.availability,
            // Suggested skills still require the explicit confirmation checkbox.
            offered: Object.fromEntries(
              x.capabilities
                .filter((c) => known.has(c.normalizedSkillId))
                .map((c) => [c.normalizedSkillId, { level: c.level, evidence: c.evidence ?? "" }]),
            ),
            confirmSkills: false,
          }));
        },
      },
    );
  };
  const errors = validate(draft);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const stepErrors = (i: number) =>
    Object.keys(errors).filter((k) =>
      i === 0
        ? k === "displayName"
        : i === 1
          ? k === "confirmSkills"
          : i === 2
            ? k.startsWith("availability")
            : true,
    );

  const next = () => {
    if (stepErrors(step).length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    if (Object.keys(errors).length) {
      setShowErrors(true);
      return;
    }
    setSessionError(null);
    setPreparing(true);
    let currentSession;
    try {
      currentSession = await ensureLiveSession(client);
    } catch (e) {
      setSessionError(e);
      setPreparing(false);
      return;
    }
    setPreparing(false);
    create.mutate(
      { input: toInput(draft, skills) },
      {
        onSuccess: (participant) => {
          client.setQueryData(keys.participant(participant.id), participant);
          writeDeviceMemory((m) => ({ ...m, participantId: participant.id }), currentSession);
          router.push("/me?joined=1");
        },
      },
    );
  };

  const err = (k: string) => (showErrors ? errors[k] : undefined);
  const input = toInput(draft, skills);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] lg:gap-12">
      <div className="min-w-0">
        <ol className="mb-6 grid grid-cols-2 gap-x-4 sm:flex sm:flex-wrap sm:gap-x-6" aria-label="Onboarding steps">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? "step" : undefined}
                className={cx(
                  "type-meta min-h-11 font-medium",
                  i === step ? "text-action" : i < step ? "text-ink underline" : "text-muted",
                )}
              >
                {i + 1}. {s}
              </button>
            </li>
          ))}
        </ol>
        <h2 ref={headingRef} tabIndex={-1} className="type-section mb-6 outline-none">
          {STEPS[step]}
        </h2>

        {step === 0 ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-panel border border-line-panel bg-surface p-4">
              <Field
                label="Describe yourself in your own words"
                optional
                helper="COHUE drafts the steps below for you to review. Nothing is saved until you confirm on the last step."
              >
                {(f) => (
                  <TextArea
                    id={f.id}
                    aria-describedby={f.describedBy}
                    rows={3}
                    maxLength={2000}
                    value={about}
                    placeholder="I'm a hardware tinkerer, free most weekday evenings, keen to learn design…"
                    onChange={(e) => setAbout(e.target.value)}
                  />
                )}
              </Field>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                <Button size="sm" onClick={runParse} disabled={!about.trim()} pending={parse.isPending} pendingLabel="Drafting profile…">
                  Draft my profile
                </Button>
                <RecordControl
                  purpose="PROFILE"
                  language={draft.language}
                  onTranscript={(t) => setAbout((a) => [a.trim(), t].filter(Boolean).join("\n").slice(0, 2000))}
                />
              </div>
              {parse.isError ? (
                <ErrorNotice className="mt-3" error={parse.error} title="Could not draft from text. Your text is kept; fill the steps directly." />
              ) : null}
              {parse.isSuccess ? (
                <Notice tone="pending" className="mt-3" title="Draft filled in. Review every step; suggested skills need your confirmation.">
                  {unknowns?.length ? (
                    <ul className="mt-1 list-disc pl-5">
                      {unknowns.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  ) : null}
                </Notice>
              ) : null}
            </div>
            <Field
              label="Display name"
              helper="Shown to mission creators and teammates only when you are proposed or invited."
              error={err("displayName")}
            >
              {(f) => (
                <TextInput
                  id={f.id}
                  aria-describedby={f.describedBy}
                  invalid={f.invalid}
                  value={draft.displayName}
                  autoComplete="nickname"
                  maxLength={120}
                  onChange={(e) => set({ displayName: e.target.value })}
                />
              )}
            </Field>
            <Field label="Preferred language" helper="Invitations and briefs are offered in this language when available.">
              {(f) => (
                <Select
                  id={f.id}
                  aria-describedby={f.describedBy}
                  value={draft.language}
                  onChange={(e) => set({ language: e.target.value })}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value} lang={l.value}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-6">
            <fieldset className="flex flex-col gap-3">
              <legend className="type-panel mb-1">Skills you offer</legend>
              <p className="text-sm text-muted">
                Choose from the shared skill list. Only skills you confirm are used for matching.
              </p>
              <ul className="divide-y divide-line-subtle rounded-field border border-line-panel bg-surface">
                {skills.map((s) => {
                  const o = draft.offered[s.id];
                  return (
                    <li key={s.id} className="p-4">
                      <Checkbox
                        checked={Boolean(o)}
                        onCheckedChange={(on) => {
                          const offered = { ...draft.offered };
                          if (on) offered[s.id] = { level: null, evidence: "" };
                          else delete offered[s.id];
                          set({ offered, confirmSkills: false });
                        }}
                        label={<span className="font-medium">{skillLabel(s.id)}</span>}
                        description={`${s.category} · ${skillHint(s, draft.language)}`}
                      />
                      {o ? (
                        <div className="mt-3 grid gap-3 pl-9 sm:grid-cols-[180px_minmax(0,1fr)]">
                          <Field label="Level">
                            {(f) => (
                              <Select
                                id={f.id}
                                value={o.level ?? ""}
                                onChange={(e) =>
                                  set({
                                    offered: {
                                      ...draft.offered,
                                      [s.id]: { ...o, level: e.target.value ? Number(e.target.value) : null },
                                    },
                                    confirmSkills: false,
                                  })
                                }
                              >
                                <option value="">Not stated</option>
                                <option value="1">1 · Beginner</option>
                                <option value="2">2 · Some experience</option>
                                <option value="3">3 · Practiced</option>
                                <option value="4">4 · Strong</option>
                                <option value="5">5 · Expert</option>
                              </Select>
                            )}
                          </Field>
                          <Field label="Evidence" optional>
                            {(f) => (
                              <TextInput
                                id={f.id}
                                value={o.evidence}
                                maxLength={2000}
                                placeholder="e.g. Built three community kiosks"
                                onChange={(e) =>
                                  set({
                                    offered: { ...draft.offered, [s.id]: { ...o, evidence: e.target.value } },
                                    confirmSkills: false,
                                  })
                                }
                              />
                            )}
                          </Field>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {Object.keys(draft.offered).length ? (
                <div className={cx("rounded-field p-3", err("confirmSkills") ? "bg-declined-bg" : "bg-subtle")}>
                  <Checkbox
                    checked={draft.confirmSkills}
                    onCheckedChange={(v) => set({ confirmSkills: v })}
                    label="I confirm these skills and levels describe me accurately."
                    description={err("confirmSkills") ?? "Matching uses only what you confirm here."}
                  />
                </div>
              ) : null}
            </fieldset>
            <fieldset className="flex flex-col gap-3">
              <legend className="type-panel mb-1">What you are looking for</legend>
              <p className="text-sm text-muted">Skills you would like help with (used to find mutual benefit).</p>
              <ToggleChips
                options={skills}
                selected={draft.needs}
                onChange={(needs) => set({ needs })}
                label="Needs"
              />
            </fieldset>
            <fieldset className="flex flex-col gap-3">
              <legend className="type-panel mb-1">Interests</legend>
              <ToggleChips
                options={skills}
                selected={draft.interests}
                onChange={(interests) => set({ interests })}
                label="Interests"
              />
            </fieldset>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3" aria-labelledby="avail-h">
              <h3 id="avail-h" className="type-panel">When you are available</h3>
              <p className="text-sm text-muted">
                Exact times in your timezone. Without availability you will not be matched; COHUE never assumes “anytime”.
              </p>
              {draft.availability.map((a, i) => (
                <IntervalRow
                  key={a.key}
                  legend={`Time ${i + 1}`}
                  value={a}
                  error={err(`availability.${a.key}`)}
                  onChange={(v) =>
                    set({ availability: draft.availability.map((x) => (x.key === a.key ? v : x)) })
                  }
                  onRemove={() =>
                    set({ availability: draft.availability.filter((x) => x.key !== a.key) })
                  }
                />
              ))}
              {draft.availability.length < 30 ? (
                <Button
                  size="sm"
                  className="self-start"
                  onClick={() =>
                    set({ availability: [...draft.availability, newIntervalDraft(draft.availability.length + 1)] })
                  }
                >
                  Add another time
                </Button>
              ) : null}
            </section>
            <section className="flex flex-col gap-4" aria-labelledby="consent-h">
              <h3 id="consent-h" className="type-panel">Visibility and participation</h3>
              <p className="text-sm text-muted">Each choice is separate. Nothing is selected for you.</p>
              <Checkbox
                checked={draft.participationOptIn}
                onCheckedChange={(v) => set({ participationOptIn: v })}
                label="I want to be considered for missions"
                description="You can still decline any invitation. Nobody joins a team without saying yes."
              />
              <Checkbox
                checked={draft.discoverable}
                onCheckedChange={(v) => set({ discoverable: v })}
                label="Let mission searches find me"
                description="Required for matching. Creators see your name, role fit and availability overlap only when you are proposed."
              />
              <Checkbox
                checked={draft.publicGraph}
                onCheckedChange={(v) => set({ publicGraph: v })}
                label="Show a minimal entry on the public network map"
                description="Optional. Shows your name and skills on the public network; never your availability."
              />
              {!draft.participationOptIn || !draft.discoverable ? (
                <Notice tone="pending">
                  Without both participation and discoverability you can still receive direct invitation links, but searches will not propose you.
                </Notice>
              ) : null}
            </section>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Check everything before saving. You can edit any step.</p>
            {Object.keys(errors).length ? (
              <Notice tone="declined" role="alert" title="Some details need attention">
                <ul className="list-disc pl-5">
                  {Object.values(errors).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Notice>
            ) : null}
            <ReviewList input={input} />
          </div>
        ) : null}

        {sessionError ? <ErrorNotice className="mt-6" error={sessionError} title="Could not start a session" /> : null}
        {create.isError ? (
          <ErrorNotice
            className="mt-6"
            error={create.error}
            title={create.error.code === "INVALID_INPUT" ? "The server could not accept this profile" : undefined}
          />
        ) : null}
        {create.isError && Object.keys(create.error.fieldErrors).length ? (
          <ul className="type-meta mt-2 list-disc pl-5 text-declined">
            {Object.entries(create.error.fieldErrors).map(([k, v]) => (
              <li key={k}>
                {k}: {v.join(", ")}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="safe-bottom sticky bottom-0 z-10 -mx-4 mt-8 flex gap-3 border-t border-line-subtle bg-canvas px-4 pt-4 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
          {step > 0 ? (
            <Button onClick={() => setStep((s) => s - 1)} className="flex-1 md:flex-none">
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={next} className="flex-1 md:flex-none md:min-w-[200px]">
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={submit}
              pending={preparing || create.isPending}
              pendingLabel="Saving profile…"
              className="flex-1 md:flex-none md:min-w-[200px]"
            >
              Save profile
            </Button>
          )}
        </div>
      </div>
      <aside className="hidden lg:block" aria-label="Profile summary">
        <Panel className="sticky top-28 p-6">
          <p className="eyebrow">Summary · updates as you type</p>
          <ReviewList input={input} compact />
        </Panel>
      </aside>
    </div>
  );
}

function ReviewList({
  input,
  compact,
}: {
  input: ApiInput<"createParticipant">;
  compact?: boolean;
}) {
  return (
    <dl className={cx("m-0", compact ? "mt-2" : "rounded-panel border border-line-panel bg-surface px-5")}>
      <KeyValue label="Name">{input.displayName || <span className="text-muted">Not entered</span>}</KeyValue>
      <KeyValue label="Language">{LANGUAGES.find((l) => l.value === input.language)?.label ?? input.language}</KeyValue>
      <KeyValue label="Offers">
        {input.capabilities.length
          ? input.capabilities
              .map((c) => `${skillLabel(c.normalizedSkillId)}${c.level ? ` (level ${c.level})` : ""}`)
              .join(", ")
          : <span className="text-muted">None yet</span>}
      </KeyValue>
      <KeyValue label="Needs">{input.needs.length ? input.needs.map(skillLabel).join(", ") : <span className="text-muted">None</span>}</KeyValue>
      <KeyValue label="Interests">
        {input.interests.length ? input.interests.map(skillLabel).join(", ") : <span className="text-muted">None</span>}
      </KeyValue>
      <KeyValue label="Availability">
        {input.availability.length ? (
          <ul className="m-0 list-none p-0">
            {input.availability.map((a) => (
              <li key={a.start + a.end}>{formatInterval(a)}</li>
            ))}
          </ul>
        ) : (
          <span className="text-muted">None — you will not be matched</span>
        )}
      </KeyValue>
      <KeyValue label="Participation">{input.participationOptIn ? "✓ Opted in" : "− Not opted in"}</KeyValue>
      <KeyValue label="Discoverable">{input.visibility.discoverable ? "✓ Yes" : "− No"}</KeyValue>
      <KeyValue label="Public map">{input.visibility.publicGraph ? "✓ Shown" : "− Hidden"}</KeyValue>
    </dl>
  );
}
