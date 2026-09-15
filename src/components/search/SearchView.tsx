"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchOutcome, SearchResult } from "@/lib/queries/search";
import { PostCard } from "@/components/post/PostCard";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/components/i18n/LocaleProvider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries/ru";

// Left untranslated on purpose: they demonstrate that a query in one language
// finds posts in the other two.
const EXAMPLES = ["оқу", "векторный поиск", "design systems", "#rag"];

function noticeFor(outcome: SearchOutcome, t: Dictionary) {
  if (!outcome.semanticAvailable) return t.search.disabled;
  if (outcome.semanticError) return t.search.unavailable;
  return null;
}

export function SearchView({
  initialQuery,
  initialOutcome,
}: {
  initialQuery: string;
  initialOutcome: SearchOutcome | null;
}) {
  const t = useT();
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [term, setTerm] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[] | null>(
    initialOutcome?.results ?? null,
  );
  const [semantic, setSemantic] = useState(
    initialOutcome?.semanticAvailable ?? false,
  );
  const [notice, setNotice] = useState<string | null>(
    initialOutcome ? noticeFor(initialOutcome, t) : null,
  );
  const [loading, setLoading] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(
    initialOutcome?.nextOffset ?? null,
  );
  const [loadingMore, setLoadingMore] = useState(false);

  // Searching is something a person does, not state to synchronise, so the
  // request lives in the handler instead of an effect.
  async function run(raw: string) {
    const next = raw.trim();
    setQuery(raw);
    setTerm(next);
    router.replace(next ? `/search?q=${encodeURIComponent(next)}` : "/search");

    if (!next) {
      setResults(null);
      setNotice(null);
      setNextOffset(null);
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(next)}`);
      if (!res.ok) throw new Error();
      const outcome: SearchOutcome = await res.json();
      setResults(outcome.results);
      setSemantic(outcome.semanticAvailable);
      setNextOffset(outcome.nextOffset);
      setNotice(noticeFor(outcome, t));
    } catch {
      setNotice(t.search.failed);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(term)}&offset=${nextOffset}`,
      );
      if (!res.ok) throw new Error();
      const outcome: SearchOutcome = await res.json();
      setResults((prev) => [...(prev ?? []), ...outcome.results]);
      setNextOffset(outcome.nextOffset);
    } catch {
      setNotice(t.search.loadMoreFailed);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="border-b border-line py-5"
      >
        <label htmlFor="q" className="sr-only">
          {t.search.label}
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-faint"
          >
            {t.search.submit}
          </button>
        </div>

        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
          {t.search.hint}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => void run(example)}
              className="rounded-full border border-line px-2.5 py-1 text-[0.75rem] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {notice ? (
        <p className="border-b border-line py-3 text-[0.8125rem] text-ember">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <FeedSkeleton count={3} label={t.search.loading} />
      ) : results === null ? (
        <div className="pt-6">
          <EmptyState
            title={t.search.promptTitle}
            description={t.search.promptDescription}
          />
        </div>
      ) : results.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            title={t.search.emptyTitle}
            description={format(t.search.emptyDescription, { query: term })}
          />
        </div>
      ) : (
        <>
          <p
            role="status"
            aria-live="polite"
            className="py-3 text-[0.8125rem] text-ink-faint"
          >
            {`${t.search.found}: ${results.length}${semantic ? ` · ${t.search.withMeaning}` : ""}`}
          </p>
          <div className="thread divide-y divide-line">
            {results.map((result) => (
              <div key={result.id}>
                <PostCard
                  post={result}
                  onChange={(updated) =>
                    setResults(
                      (prev) =>
                        prev?.map((r) =>
                          r.id === updated.id ? { ...r, ...updated } : r,
                        ) ?? null,
                    )
                  }
                  onDelete={(id) =>
                    setResults(
                      (prev) => prev?.filter((r) => r.id !== id) ?? null,
                    )
                  }
                />
                {result.matchedBy.includes("semantic") &&
                !result.matchedBy.includes("text") ? (
                  <p className="pb-3 pl-[3.375rem] text-[0.75rem] text-ink-faint">
                    {t.search.semanticOnly}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {nextOffset !== null ? (
            <div className="py-6 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60"
              >
                {loadingMore ? t.feed.loading : t.feed.loadMore}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
