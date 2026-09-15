import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteTime, monthYear, relativeTime } from "@/lib/i18n/time";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LOCALES } from "@/lib/i18n/locales";

const NOW = new Date("2026-09-15T12:00:00Z");

function at(offsetMs: number) {
  return new Date(NOW.getTime() - offsetMs).toISOString();
}

afterEach(() => vi.useRealTimers());

function freeze() {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
}

describe("relativeTime", () => {
  it.each([
    [1_000, "только что"],
    [60_000, "1 минуту назад"],
    [3 * 60_000, "3 минуты назад"],
    [7 * 60_000, "7 минут назад"],
    [60 * 60_000, "1 час назад"],
    [3 * 60 * 60_000, "3 часа назад"],
    [26 * 60 * 60_000, "вчера"],
    [3 * 24 * 60 * 60_000, "3 дня назад"],
    [10 * 24 * 60 * 60_000, "1 неделю назад"],
    [90 * 24 * 60 * 60_000, "2 месяца назад"],
    [800 * 24 * 60 * 60_000, "2 года назад"],
  ])("formats %i ms ago in Russian as %j", (offset, expected) => {
    freeze();
    expect(relativeTime(at(offset), "ru", getDictionary("ru"))).toBe(expected);
  });

  it("uses one Kazakh form and never falls back to the root locale", () => {
    freeze();
    const kk = getDictionary("kk");
    expect(relativeTime(at(15 * 60_000), "kk", kk)).toBe("15 минут бұрын");
    expect(relativeTime(at(2 * 60 * 60_000), "kk", kk)).toBe("2 сағат бұрын");
    expect(relativeTime(at(26 * 60 * 60_000), "kk", kk)).toBe("кеше");
  });

  it("counts English units", () => {
    freeze();
    const en = getDictionary("en");
    expect(relativeTime(at(60_000), "en", en)).toBe("1 minute ago");
    expect(relativeTime(at(5 * 60_000), "en", en)).toBe("5 minutes ago");
  });

  it.each(LOCALES)("reads a future timestamp as the present in %s", (locale) => {
    freeze();
    const t = getDictionary(locale);
    expect(relativeTime(at(-4 * 60 * 60_000), locale, t)).toBe(t.time.now);
  });

  it.each(LOCALES)("leaves no placeholder unfilled in %s", (locale) => {
    freeze();
    const t = getDictionary(locale);
    for (const offset of [60_000, 3 * 60_000, 3_600_000, 3 * 86_400_000]) {
      expect(relativeTime(at(offset), locale, t)).not.toContain("{");
    }
  });
});

describe("absoluteTime", () => {
  it.each([
    ["ru", "15 сентября 2026,"],
    ["kk", "2026 ж. 15 қыркүйек,"],
    ["en", "15 September 2026,"],
  ] as const)("writes the month out in %s", (locale, expected) => {
    expect(absoluteTime("2026-09-15T12:00:00Z", getDictionary(locale))).toContain(
      expected,
    );
  });

  it("pads the minutes", () => {
    const value = absoluteTime("2026-09-15T12:05:00Z", getDictionary("ru"));
    expect(value).toMatch(/\d{1,2}:05$/);
  });
});

describe("monthYear", () => {
  it.each([
    ["ru", "сентября 2026"],
    ["kk", "қыркүйек 2026"],
    ["en", "September 2026"],
  ] as const)("names the month in %s", (locale, expected) => {
    expect(monthYear("2026-09-15T12:00:00Z", getDictionary(locale))).toBe(
      expected,
    );
  });
});
