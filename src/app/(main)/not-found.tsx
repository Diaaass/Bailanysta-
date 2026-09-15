import Link from "next/link";
import { getTranslations } from "@/lib/i18n";

export default async function MainNotFound() {
  const { t } = await getTranslations();

  return (
    <div className="px-4 py-16 lg:px-0">
      <div className="mx-auto max-w-[46ch] text-center">
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink">
          {t.errors.notFoundTitle}
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
          {t.errors.notFoundDescription}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/"
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {t.errors.toFeed}
          </Link>
          <Link
            href="/search"
            className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong"
          >
            {t.nav.search}
          </Link>
        </div>
      </div>
    </div>
  );
}
