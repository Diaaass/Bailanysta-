"use client";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, DEFAULT_LOCALE, LOCALE_COOKIE } from "@/lib/i18n/locales";

// Last-resort boundary: it replaces the root layout, so it ships its own
// <html> and cannot rely on the app's providers or styles. That includes the
// locale provider, so the language is read straight off the cookie.
function cookieLocale() {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  const value = match?.[1] && decodeURIComponent(match[1]);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = cookieLocale();
  const t = getDictionary(locale);

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#eaeef2",
          color: "#121a22",
        }}
      >
        <div style={{ maxWidth: "34rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.375rem", margin: 0 }}>
            {t.errors.appFailedTitle}
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.6, color: "#59646f" }}>
            {t.errors.appFailedDescription}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              border: 0,
              borderRadius: "999px",
              background: "#0d7490",
              color: "#fff",
              padding: "0.6rem 1.4rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            {t.errors.reload}
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#8a95a1" }}>
              {t.errors.code}: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
