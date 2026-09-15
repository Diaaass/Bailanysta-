export const COMPOSE_MODES = [
  "draft",
  "improve",
  "translate",
  "hashtags",
] as const;

export type ComposeMode = (typeof COMPOSE_MODES)[number];

export const LANGUAGES = {
  kk: "казахском",
  ru: "русском",
  en: "английском",
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

const BASE =
  "Ты помогаешь писать короткие посты для социальной сети Bailanysta. " +
  "Аудитория говорит на казахском, русском и английском. " +
  "Отвечай только текстом поста, без кавычек, без пояснений и без markdown. " +
  "Максимум 500 символов.";

export function systemPrompt(mode: ComposeMode, language?: LanguageCode) {
  switch (mode) {
    case "draft":
      return `${BASE} Напиши живой пост на заданную тему. Один-два абзаца, разговорный тон.`;
    case "improve":
      return `${BASE} Перепиши присланный текст: сделай его яснее и естественнее, сохрани смысл, язык оригинала и интонацию автора.`;
    case "translate":
      return `${BASE} Переведи присланный текст на ${LANGUAGES[language ?? "kk"]} язык. Сохрани хэштеги без перевода.`;
    case "hashtags":
      return (
        "Ты подбираешь хэштеги для поста социальной сети. " +
        "Верни от двух до четырёх хэштегов через пробел, каждый начинается с #, без кавычек и пояснений. " +
        "Язык хэштегов — язык поста."
      );
  }
}
