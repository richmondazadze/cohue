"use client";
import { useId, useMemo } from "react";
import type { Interval } from "@/contracts";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { localTimezone, utcToZoned, zonedToUtc } from "@/client/time";

export type IntervalDraft = {
  key: string;
  date: string;
  start: string;
  end: string;
  endDate?: string;
  timezone: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function newIntervalDraft(
  offsetDays = 0,
  start = "18:00",
  end = "20:00",
): IntervalDraft {
  const tz = localTimezone();
  const now = new Date(Date.now() + offsetDays * 86400000);
  const today = utcToZoned(now.toISOString(), tz).date;
  return {
    key: globalThis.crypto.randomUUID(),
    date: today || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    start,
    end,
    timezone: tz,
  };
}

export function intervalFromDraft(
  d: IntervalDraft,
): { ok: true; value: Interval } | { ok: false; error: string } {
  const start = zonedToUtc(d.date, d.start, d.timezone);
  const end = zonedToUtc(d.endDate ?? d.date, d.end, d.timezone);
  if (!start || !end) return { ok: false, error: "Enter a date, start and end time." };
  if (Date.parse(start) >= Date.parse(end))
    return { ok: false, error: "End time must be after the start time." };
  return { ok: true, value: { start, end, timezone: d.timezone } };
}

export function draftFromInterval(i: Interval): IntervalDraft {
  const s = utcToZoned(i.start, i.timezone);
  const e = utcToZoned(i.end, i.timezone);
  return {
    key: globalThis.crypto.randomUUID(),
    date: s.date,
    start: s.time,
    end: e.time,
    endDate: e.date !== s.date ? e.date : undefined,
    timezone: i.timezone,
  };
}

export function useTimezones(current: string[]): string[] {
  return useMemo(() => {
    let all: string[] = [];
    try {
      all = Intl.supportedValuesOf("timeZone");
    } catch {
      all = ["UTC", "America/Chicago", "America/New_York", "Europe/Paris", "Europe/Madrid", "Europe/London"];
    }
    const set = new Set([localTimezone(), ...current, "UTC", ...all]);
    return [...set];
  }, [current]);
}

export function IntervalRow({
  value,
  onChange,
  onRemove,
  legend,
  error,
  allowMultiDay,
}: {
  value: IntervalDraft;
  onChange: (v: IntervalDraft) => void;
  onRemove?: () => void;
  legend: string;
  error?: string | null;
  allowMultiDay?: boolean;
}) {
  const zones = useTimezones([value.timezone]);
  const id = useId();
  return (
    <fieldset
      aria-describedby={error ? `${id}-err` : undefined}
      className="rounded-field border border-line-panel bg-subtle p-4"
    >
      <legend className="type-compact px-1">{legend}</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={allowMultiDay ? "Start date" : "Date"}>
          {(f) => (
            <TextInput
              id={f.id}
              type="date"
              value={value.date}
              onChange={(e) => onChange({ ...value, date: e.target.value })}
              required
            />
          )}
        </Field>
        <Field label="Start">
          {(f) => (
            <TextInput
              id={f.id}
              type="time"
              value={value.start}
              onChange={(e) => onChange({ ...value, start: e.target.value })}
              required
            />
          )}
        </Field>
        {allowMultiDay ? (
          <Field label="End date">
            {(f) => (
              <TextInput
                id={f.id}
                type="date"
                value={value.endDate ?? value.date}
                onChange={(e) => onChange({ ...value, endDate: e.target.value })}
                required
              />
            )}
          </Field>
        ) : null}
        <Field label="End">
          {(f) => (
            <TextInput
              id={f.id}
              type="time"
              value={value.end}
              onChange={(e) => onChange({ ...value, end: e.target.value })}
              required
            />
          )}
        </Field>
        <Field label="Timezone" className={allowMultiDay ? "sm:col-span-2 lg:col-span-4" : undefined}>
          {(f) => (
            <Select
              id={f.id}
              value={value.timezone}
              onChange={(e) => onChange({ ...value, timezone: e.target.value })}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {error ? (
        <p id={`${id}-err`} className="type-meta mt-2 font-medium text-declined">
          − {error}
        </p>
      ) : null}
      {onRemove ? (
        <Button size="sm" variant="tertiary" className="mt-2" onClick={onRemove}>
          Remove this time
        </Button>
      ) : null}
    </fieldset>
  );
}
