"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries/ru";
import type { Locale } from "@/lib/i18n/locales";

type LocaleValue = { locale: Locale; t: Dictionary };

const LocaleContext = createContext<LocaleValue | null>(null);

export function useT() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useT must be used inside LocaleProvider");
  return value.t;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value.locale;
}

// The dictionary is resolved on the server and handed down, so a client
// component never ships all three languages to the browser.
export function LocaleProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </LocaleContext.Provider>
  );
}
