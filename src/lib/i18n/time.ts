import { format } from "./format";
import { pluralWord } from "./plural";
import type { Dictionary } from "./dictionaries/ru";
import type { Locale } from "./locales";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30.44 * DAY;
const YEAR = 365.25 * DAY;

const STEPS = [
  ["year", YEAR],
  ["month", MONTH],
  ["week", WEEK],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
] as const;

/**
 * Written out rather than delegated to Intl.RelativeTimeFormat: Chromium builds
 * ship a reduced ICU set without Kazakh, so the browser renders "-15 min" where
 * Node renders "15 минут бұрын" — wrong for the reader and a hydration mismatch
 * on top. The dictionary gives the same answer everywhere.
 */
export function relativeTime(iso: string, locale: Locale, t: Dictionary) {
  const elapsed = Date.now() - new Date(iso).getTime();
  // A clock skew of a few seconds must not read as "in a minute".
  if (elapsed < MINUTE) return t.time.now;

  for (const [unit, span] of STEPS) {
    if (elapsed < span) continue;
    const n = Math.floor(elapsed / span);
    if (unit === "day" && n === 1) return t.time.yesterday;
    return format(pluralWord(locale, n, t.time[unit]), { n });
  }
  return t.time.now;
}

function clock(date: Date) {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function absoluteTime(iso: string, t: Dictionary) {
  const date = new Date(iso);
  return format(t.time.absolute, {
    d: date.getDate(),
    month: t.time.months[date.getMonth()],
    y: date.getFullYear(),
    time: clock(date),
  });
}

export function monthYear(iso: string, t: Dictionary) {
  const date = new Date(iso);
  return format(t.time.monthYear, {
    month: t.time.months[date.getMonth()],
    y: date.getFullYear(),
  });
}
