"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/LocaleProvider";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="px-4 py-16 lg:px-0">
      <div className="mx-auto max-w-[46ch] text-center">
        <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink">
          {t.errors.routeTitle}
        </h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
          {t.errors.routeDescription}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {t.errors.retry}
          </button>
          <Link
            href="/"
            className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong"
          >
            {t.errors.toFeed}
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-6 text-[0.75rem] text-ink-faint">
            {t.errors.code}: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
