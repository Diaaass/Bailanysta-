"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { setLocale } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT, type Locale } from "@/lib/i18n/locales";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";

export function LocaleToggle() {
  const current = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      // The dictionary is resolved on the server, so the tree has to be asked
      // for again — the cookie alone changes nothing already on screen.
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.locale.group}
      className={cn(
        "inline-flex rounded-full border border-line p-0.5 transition-opacity",
        pending && "opacity-60",
      )}
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            role="radio"
            aria-checked={active}
            title={LOCALE_NAMES[locale]}
            aria-label={LOCALE_NAMES[locale]}
            onClick={() => choose(locale)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[0.6875rem] font-medium tracking-wide transition-colors",
              active ? "bg-accent text-white" : "text-ink-faint hover:text-ink",
            )}
          >
            {LOCALE_SHORT[locale]}
          </button>
        );
      })}
    </div>
  );
}
