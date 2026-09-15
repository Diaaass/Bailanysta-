"use client";

// Last-resort boundary: it replaces the root layout, so it ships its own
// <html> and cannot rely on the app's providers or styles.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
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
            Приложение не запустилось
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.6, color: "#59646f" }}>
            Произошёл сбой на уровне всего приложения. Перезагрузите страницу.
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
            Перезагрузить
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#8a95a1" }}>
              Код ошибки: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
