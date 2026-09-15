"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "./locales";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR,
    sameSite: "lax",
    path: "/",
  });
}
