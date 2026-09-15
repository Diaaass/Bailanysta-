import { describe, expect, it, vi, afterEach } from "vitest";
import { avatarStyle, cn, initials, relativeTime } from "@/lib/utils";

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
