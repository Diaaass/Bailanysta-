import { describe, expect, it, vi, afterEach } from "vitest";
import {
  avatarStyle,
  cn,
  initials,
  plural,
  pluralWord,
  relativeTime,
  safeCallbackUrl,
} from "@/lib/utils";

afterEach(() => vi.useRealTimers());

describe("cn", () => {
  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Айгерім Сәтбаева")).toBe("АС");
  });

  it("handles a single word", () => {
    expect(initials("demo")).toBe("D");
  });

  it("falls back for an empty name instead of throwing", () => {
    expect(initials("   ")).toBe("?");
  });

  it("uses code points so a surrogate pair is not split", () => {
    expect(initials("🚀 launch")).toBe("🚀L");
  });
});

describe("avatarStyle", () => {
  it("is deterministic for the same seed", () => {
    expect(avatarStyle("demo")).toEqual(avatarStyle("demo"));
  });

  it("separates different seeds", () => {
    expect(avatarStyle("demo")).not.toEqual(avatarStyle("aigerim"));
  });
});

describe("relativeTime", () => {
  it("formats recent timestamps in Russian", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    expect(relativeTime("2026-09-15T11:00:00Z")).toContain("час");
  });

  it("uses the natural Russian wording for the nearest days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    // numeric: "auto" deliberately prefers "позавчера" over "2 дня назад".
    expect(relativeTime("2026-09-13T12:00:00Z")).toBe("позавчера");
  });

  it("falls back to counted days further out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    expect(relativeTime("2026-09-10T12:00:00Z")).toContain("дн");
  });

  it("switches to months for older posts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    expect(relativeTime("2026-06-15T12:00:00Z")).toContain("мес");
  });
});

describe("plural", () => {
  it.each([
    [1, "пост"],
    [2, "поста"],
    [4, "поста"],
    [5, "постов"],
    [11, "постов"],
    [12, "постов"],
    [14, "постов"],
    [21, "пост"],
    [22, "поста"],
    [25, "постов"],
    [101, "пост"],
    [111, "постов"],
    [0, "постов"],
  ])("%i -> %s", (n, expected) => {
    expect(pluralWord(n, "пост", "поста", "постов")).toBe(expected);
  });

  it("prefixes the number", () => {
    expect(plural(2, "лайк", "лайка", "лайков")).toBe("2 лайка");
  });
});

describe("safeCallbackUrl", () => {
  it.each(["/", "/search", "/profile/demo", "/post/abc?x=1", "/a#b"])(
    "keeps the same-origin path %j",
    (path) => {
      expect(safeCallbackUrl(path)).toBe(path);
    },
  );

  it.each([
    "https://evil.example",
    "http://evil.example/login",
    // Protocol-relative: the browser resolves this to an absolute URL.
    "//evil.example",
    // Backslashes: some browsers normalise them to forward slashes.
    String.raw`\evil.example`,
    String.raw`/\evil.example`,
    "javascript:alert(1)",
    "evil.example",
  ])("refuses to leave the origin for %j", (path) => {
    expect(safeCallbackUrl(path)).toBe("/");
  });

  it("keeps a plain path that merely looks like a host", () => {
    // "/evil.example" is a same-origin path, not an off-site redirect.
    expect(safeCallbackUrl("/evil.example")).toBe("/evil.example");
  });

  it("falls back to the feed for a missing value", () => {
    expect(safeCallbackUrl(null)).toBe("/");
    expect(safeCallbackUrl(undefined)).toBe("/");
    expect(safeCallbackUrl("")).toBe("/");
  });
});
