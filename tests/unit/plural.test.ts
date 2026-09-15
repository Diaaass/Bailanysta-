import { describe, expect, it } from "vitest";
import { plural, pluralWord } from "@/lib/i18n/plural";

const RU = { one: "пост", few: "поста", many: "постов" };
const KK = { one: "жазба", few: "жазба", many: "жазба" };
const EN = { one: "post", few: "posts", many: "posts" };

describe("pluralWord", () => {
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
    [0, "постов"],
  ])("picks the Russian form for %i", (n, expected) => {
    expect(pluralWord("ru", n, RU)).toBe(expected);
  });

  it.each([
    [0, "posts"],
    [1, "post"],
    [2, "posts"],
    [21, "posts"],
  ])("picks the English form for %i", (n, expected) => {
    expect(pluralWord("en", n, EN)).toBe(expected);
  });

  it("uses one Kazakh form regardless of the number", () => {
    for (const n of [0, 1, 2, 5, 21]) {
      expect(pluralWord("kk", n, KK)).toBe("жазба");
    }
  });
});

describe("plural", () => {
  it("prefixes the number", () => {
    expect(plural("ru", 2, RU)).toBe("2 поста");
    expect(plural("en", 2, EN)).toBe("2 posts");
  });
});
