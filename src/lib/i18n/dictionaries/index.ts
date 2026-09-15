import { ru } from "./ru";
import { kk } from "./kk";
import { en } from "./en";
import { DEFAULT_LOCALE, type Locale } from "../locales";

export type { Dictionary } from "./ru";

const DICTIONARIES = { ru, kk, en } as const;

export function getDictionary(locale: Locale) {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
