// Explicit timezone handling: wall-clock inputs are converted with the chosen IANA zone, never guessed.
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

export const toIsoSeconds = (ms: number) =>
  new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");

/** "2026-10-25" + "14:00" in "America/Chicago" -> "2026-10-25T19:00:00Z". Returns null for invalid input. */
export function zonedToUtc(
  date: string,
  time: string,
  timeZone: string,
): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  try {
    const guess = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2], 0);
    if (Number.isNaN(guess)) return null;
    let result = guess - offsetMs(guess, timeZone);
    result = guess - offsetMs(result, timeZone);
    return toIsoSeconds(result);
  } catch {
    return null;
  }
}

/** UTC ISO -> wall clock parts in a zone, for prefilling inputs. */
export function utcToZoned(iso: string, timeZone: string) {
  const ms = Date.parse(iso);
  const local = new Date(ms + offsetMs(ms, timeZone));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

export function formatInterval(
  interval: { start: string; end: string; timezone: string },
  locale?: string,
  displayZone?: string,
): string {
  const zone = displayZone ?? interval.timezone;
  try {
    const day = new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const clock = new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
    });
    const s = new Date(interval.start);
    const e = new Date(interval.end);
    const sameDay = day.format(s) === day.format(e);
    return `${day.format(s)} · ${clock.format(s)}–${sameDay ? "" : `${day.format(e)} `}${clock.format(e)} (${zone})`;
  } catch {
    return `${interval.start} – ${interval.end}`;
  }
}

export function formatTimestamp(iso: string, locale?: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatClock(iso: string, locale?: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function minutesBetween(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 60000);
}
