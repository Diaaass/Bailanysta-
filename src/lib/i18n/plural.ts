import type { Locale } from "./locales";

export type PluralForms = {
  readonly one: string;
  readonly few: string;
  readonly many: string;
};

const RULES = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale) {
  let rules = RULES.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    RULES.set(locale, rules);
  }
  return rules;
}

/**
 * Russian needs three forms, Kazakh and English one. Intl decides which form a
 * number takes so the dictionaries only have to list the words.
 */
export function pluralWord(locale: Locale, n: number, forms: PluralForms) {
  const category = rulesFor(locale).select(n);
  if (category === "one") return forms.one;
  if (category === "few") return forms.few;
  return forms.many;
}

export function plural(locale: Locale, n: number, forms: PluralForms) {
  return `${n} ${pluralWord(locale, n, forms)}`;
}
