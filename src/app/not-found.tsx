import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { getTranslations } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getTranslations();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Logo className="h-9 w-9 text-accent" />
      <h1 className="mt-5 text-[1.375rem] font-semibold tracking-tight text-ink">
        {t.errors.globalNotFoundTitle}
      </h1>
      <p className="mt-2 max-w-[42ch] text-[0.9375rem] leading-relaxed text-ink-muted">
        {t.errors.globalNotFoundDescription}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        {t.errors.toHome}
      </Link>
    </div>
  );
}
