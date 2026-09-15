import { describe, expect, it } from "vitest";
import { z } from "zod";
import { LOCALES, negotiateLocale, type Locale } from "@/lib/i18n/locales";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";
import { translateIssue } from "@/lib/i18n/translate-issue";
import {
  bioSchema,
  commentContentSchema,
  credentialsSchema,
  displayNameSchema,
  postContentSchema,
  profileUpdateSchema,
  registerSchema,
  usernameSchema,
} from "@/lib/validation";

describe("negotiateLocale", () => {
  it.each([
    ["kk", "kk"],
    ["kk-KZ", "kk"],
    ["en-US,en;q=0.9", "en"],
    ["ru-RU,ru;q=0.9,en;q=0.8", "ru"],
    ["de-DE,de;q=0.9,en;q=0.7", "en"],
  ])("picks %j as %j", (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });

  it("prefers the highest-weighted supported language", () => {
    expect(negotiateLocale("fr;q=1.0,kk;q=0.9,ru;q=0.8")).toBe("kk");
  });

  it.each([null, undefined, "", "fr-FR,de;q=0.8"])(
    "falls back to Russian for %j",
    (header) => {
      expect(negotiateLocale(header)).toBe("ru");
    },
  );
});

describe("format", () => {
  it("substitutes named placeholders", () => {
    expect(format("Попробуйте через {n} мин.", { n: 3 })).toBe(
      "Попробуйте через 3 мин.",
    );
  });

  it("leaves an unknown placeholder in place rather than printing undefined", () => {
    expect(format("{a} и {b}", { a: "раз" })).toBe("раз и {b}");
  });
});

// Placeholders are part of the contract: a translation that drops {query} would
// silently show a message with no query in it.
function placeholders(value: string) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

function walk(
  value: unknown,
  path: string[],
  out: Map<string, string[]>,
) {
  if (typeof value === "string") {
    out.set(path.join("."), placeholders(value));
    return;
  }
  if (Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value as object)) {
    walk(child, [...path, key], out);
  }
}

describe("dictionaries", () => {
  const ru = new Map<string, string[]>();
  walk(getDictionary("ru"), [], ru);

  it.each(LOCALES.filter((l) => l !== "ru"))(
    "%s uses the same placeholders as ru",
    (locale) => {
      const other = new Map<string, string[]>();
      walk(getDictionary(locale), [], other);

      for (const [key, expected] of ru) {
        expect([key, other.get(key)]).toEqual([key, expected]);
      }
    },
  );

  it.each(LOCALES)("%s leaves no string empty", (locale) => {
    const entries = new Map<string, string[]>();
    walk(getDictionary(locale), [], entries);
    expect([...entries.keys()].length).toBeGreaterThan(100);
  });
});

// Schemas carry dictionary keys, so a renamed key would otherwise surface to
// the reader as raw "postTooLong".
const SCHEMA_FAILURES: Array<[string, () => z.ZodSafeParseResult<unknown>]> = [
  ["username too short", () => usernameSchema.safeParse("ab")],
  ["username too long", () => usernameSchema.safeParse("a".repeat(33))],
  ["username format", () => usernameSchema.safeParse("айгерим")],
  ["password too short", () =>
    credentialsSchema.safeParse({ username: "demo", password: "short" })],
  ["password too long", () =>
    credentialsSchema.safeParse({
      username: "demo",
      password: "a".repeat(73),
    })],
  ["display name empty", () => displayNameSchema.safeParse("   ")],
  ["display name too long", () => displayNameSchema.safeParse("a".repeat(65))],
  ["register display name", () =>
    registerSchema.safeParse({
      username: "demo",
      password: "demo1234",
      displayName: "",
    })],
  ["bio too long", () => bioSchema.safeParse("a".repeat(281))],
  ["profile bio", () =>
    profileUpdateSchema.safeParse({ displayName: "Demo", bio: "a".repeat(281) })],
  ["post empty", () => postContentSchema.safeParse("   ")],
  ["post too long", () => postContentSchema.safeParse("a".repeat(501))],
  ["comment empty", () => commentContentSchema.safeParse("")],
  ["comment too long", () => commentContentSchema.safeParse("a".repeat(301))],
];

describe("translateIssue", () => {
  it.each(LOCALES)("resolves every schema message in %s", (locale) => {
    const t = getDictionary(locale);

    for (const [name, run] of SCHEMA_FAILURES) {
      const result = run();
      expect(result.success, name).toBe(false);

      const raw = result.error!.issues[0]?.message;
      const translated = translateIssue(raw, t);

      expect([name, translated], name).not.toEqual([name, raw]);
    }
  });

  it("falls back to a generic message when there is no issue", () => {
    const t = getDictionary("ru");
    expect(translateIssue(undefined, t)).toBe(t.validation.checkFields);
  });

  it("passes an unrecognised message through", () => {
    const t = getDictionary("en");
    expect(translateIssue("something else", t)).toBe("something else");
  });
});

describe("getDictionary", () => {
  it("falls back to Russian for an unsupported locale", () => {
    expect(getDictionary("de" as Locale)).toBe(getDictionary("ru"));
  });
});
