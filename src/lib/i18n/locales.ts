export const LOCALES = ["ru", "kk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  kk: "Қазақша",
  en: "English",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  ru: "RU",
  kk: "KZ",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the closest supported locale from an Accept-Language header. Only used
 * for a visitor with no cookie yet; their explicit choice always wins.
 */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
