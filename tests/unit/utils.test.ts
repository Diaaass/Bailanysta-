import { describe, expect, it } from "vitest";
import { avatarStyle, cn, initials, safeCallbackUrl } from "@/lib/utils";

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
