export const LANGUAGES = {
  kk: { label: "KZ", title: "Қазақша" },
  ru: { label: "RU", title: "Русский" },
  en: { label: "EN", title: "English" },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Letters that exist in Kazakh Cyrillic but not in Russian. One of them is
// enough to separate the two alphabets without a language model.
const KAZAKH_ONLY = /[әғқңөұүһі]/i;
const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[a-z]/i;

/**
 * Deliberately a heuristic, not a classifier: the label is decoration, and a
 * wrong guess costs a reader nothing. Everything that actually matters -
 * search, retrieval - runs on embeddings, which need no language tag at all.
 */
export function detectLanguage(text: string): LanguageCode | null {
  const stripped = text.replace(/#[\p{L}\p{N}_]+/gu, "").trim();
  if (!stripped) return null;

  if (KAZAKH_ONLY.test(stripped)) return "kk";

  const cyrillic = (stripped.match(/[Ѐ-ӿ]/g) ?? []).length;
  const latin = (stripped.match(/[a-z]/gi) ?? []).length;

  if (cyrillic === 0 && latin === 0) return null;
  if (cyrillic > latin) return "ru";
  if (latin > cyrillic) return "en";
  return CYRILLIC.test(stripped) ? "ru" : LATIN.test(stripped) ? "en" : null;
}
