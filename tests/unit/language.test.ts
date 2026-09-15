import { describe, expect, it } from "vitest";
import { detectLanguage } from "@/lib/language";

describe("detectLanguage", () => {
  it.each([
    ["Бүгін ауа райы керемет", "kk"],
    ["Оқуды бітіргелі бір жыл болды", "kk"],
    ["Қазақ тілі үшін эмбеддинг сапасы", "kk"],
    ["Сегодня отличная погода", "ru"],
    ["Переписал выборку на курсорную пагинацию", "ru"],
    ["Skeleton screens beat spinners", "en"],
    ["Multilingual retrieval is hard", "en"],
  ])("%j -> %s", (text, expected) => {
    expect(detectLanguage(text)).toBe(expected);
  });

  it("ignores hashtags when deciding", () => {
    // The tag is Latin, the sentence is Russian: the sentence wins.
    expect(detectLanguage("Привет всем #frontend")).toBe("ru");
  });

  it("returns null when there are no letters at all", () => {
    expect(detectLanguage("123 !!! ???")).toBeNull();
    expect(detectLanguage("   ")).toBeNull();
  });

  it("returns null for a post that is only a hashtag", () => {
    expect(detectLanguage("#rag")).toBeNull();
  });

  it("prefers the dominant script in mixed text", () => {
    expect(detectLanguage("Использую TypeScript каждый день")).toBe("ru");
    expect(detectLanguage("Deployed to Vercel сегодня")).toBe("en");
  });
});
