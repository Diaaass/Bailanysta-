"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { absoluteTime, cn } from "@/lib/utils";

type Source = {
  id: string;
  content: string;
  createdAt: string;
  retrievedBy: "semantic" | "recent";
};

type Answer = { answer: string; sources: Source[] };

const EXAMPLES = [
  "О чём я чаще всего писал за последний месяц?",
  "Что я писал про базы данных?",
  "Какие темы повторяются в моих постах?",
];

// The model is asked to cite sources as [1], [2]. Turning those into anchors
// makes the answer checkable instead of something the reader has to trust.
function renderWithCitations(text: string, onCite: (index: number) => void) {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const match = /^\[(\d+)\]$/.exec(part);
    if (!match) return <span key={i}>{part}</span>;
    const index = Number(match[1]);
    return (
      <button
        key={i}
        onClick={() => onCite(index)}
        className="mx-0.5 rounded bg-accent-wash px-1 text-[0.8125rem] font-medium text-accent hover:underline"
      >
        {index}
      </button>
    );
  });
}

export function AskView() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setError("Сформулируйте вопрос хотя бы в несколько слов");
      return;
    }

    setQuestion(text);
    setLoading(true);
    setError(null);
    setHighlighted(null);

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Не удалось получить ответ");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить ответ");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="border-b border-line py-5">
        <h1 className="text-[1.25rem] font-semibold tracking-tight text-ink">
          Спросите о своих постах
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[0.875rem] leading-relaxed text-ink-muted">
          Модель читает только ваши записи — за последний месяц и те, что ближе
          всего к вопросу по смыслу. Ответ помечен ссылками на конкретные посты.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
          className="mt-4 flex gap-2"
        >
          <label htmlFor="question" className="sr-only">
            Вопрос о ваших постах
          </label>
          <input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={300}
            placeholder="О чём я писал в последнее время?"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-faint"
          >
            {loading ? "Думаю…" : "Спросить"}
          </button>
        </form>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => void ask(example)}
              disabled={loading}
              className="rounded-full border border-line px-2.5 py-1 text-left text-[0.75rem] text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.875rem] text-danger"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3 py-6" aria-busy="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : result ? (
        <div className="py-6">
          <p className="text-[1rem] leading-[1.65] text-ink">
            {renderWithCitations(result.answer, setHighlighted)}
          </p>

          {result.sources.length ? (
            <section className="mt-7">
              <h2 className="text-[0.8125rem] font-medium text-ink-muted">
                Источники
              </h2>
              <ol className="mt-2 space-y-2">
                {result.sources.map((source, i) => (
                  <li key={source.id}>
                    <Link
                      href={`/post/${source.id}`}
                      className={cn(
                        "flex gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                        highlighted === i + 1
                          ? "border-accent bg-accent-wash"
                          : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className="mt-0.5 text-[0.8125rem] font-semibold tabular-nums text-ink-faint">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] text-ink">
                          {source.content}
                        </span>
                        <span className="mt-0.5 block text-[0.75rem] text-ink-faint">
                          {absoluteTime(source.createdAt)}
                          {source.retrievedBy === "semantic"
                            ? " · найден по смыслу"
                            : " · из недавних"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="pt-6">
          <EmptyState
            title="Задайте вопрос"
            description="Например: о чём я чаще всего писал, какие темы повторяются, что я говорил про конкретную технологию."
          />
        </div>
      )}
    </div>
  );
}
