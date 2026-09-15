import { LANGUAGES, type LanguageCode } from "@/lib/language";
import { cn } from "@/lib/utils";

const STYLES: Record<LanguageCode, string> = {
  kk: "bg-lang-kk-wash text-lang-kk",
  ru: "bg-lang-ru-wash text-lang-ru",
  en: "bg-lang-en-wash text-lang-en",
};

export function LanguageBadge({
  lang,
  className,
}: {
  lang: LanguageCode;
  className?: string;
}) {
  return (
    <span
      title={LANGUAGES[lang].title}
      className={cn(
        "rounded px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide",
        STYLES[lang],
        className,
      )}
    >
      {LANGUAGES[lang].label}
    </span>
  );
}
