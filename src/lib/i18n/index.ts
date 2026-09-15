import { cookies, headers } from "next/headers";
import { getDictionary } from "./dictionaries";
import { isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./locales";

export type { Dictionary } from "./dictionaries";
export { getDictionary } from "./dictionaries";
export * from "./locales";

/**
 * The cookie is the person's own choice and always wins. Accept-Language is
 * only consulted for a first visit, so a Kazakh-speaking visitor does not have
 * to find the switch before they can read anything.
 */
export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;

  return negotiateLocale((await headers()).get("accept-language"));
}

export async function getTranslations() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
