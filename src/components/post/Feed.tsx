"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedPost } from "@/lib/queries/posts";
import { PostCard } from "@/components/post/PostCard";
import { PostComposer } from "@/components/post/PostComposer";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { plural } from "@/lib/i18n/plural";
import { useUpdates } from "@/components/updates/UpdatesProvider";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";

type Scope = "all" | "following";

type Props = {
  initialPosts: FeedPost[];
  initialCursor: string | null;
  viewer: { displayName: string; avatarSeed: string };
  showComposer?: boolean;
  showScopeSwitch?: boolean;
  authorUsername?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function Feed({
  initialPosts,
  initialCursor,
  viewer,
  showComposer = true,
  showScopeSwitch = true,
  authorUsername,
  emptyTitle,
  emptyDescription,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [scope, setScope] = useState<Scope>("all");
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const { newPosts, setSince, clearNewPosts } = useUpdates();

  const newest = posts[0]?.createdAt ?? null;

  // Tell the shared poller how far this feed has already read. Only the main
  // feed participates: a profile or search listing is not "the timeline".
  useEffect(() => {
    if (!showScopeSwitch) return;
    setSince(newest);
    return () => setSince(null);
  }, [newest, setSince, showScopeSwitch]);

  const endpoint = useCallback(
    (nextScope: Scope, nextCursor: string | null) => {
      const params = new URLSearchParams();
      if (nextCursor) params.set("cursor", nextCursor);
      if (authorUsername) {
        return `/api/users/${authorUsername}/posts?${params}`;
      }
      params.set("scope", nextScope);
      return `/api/posts?${params}`;
    },
    [authorUsername],
  );

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint(scope, cursor));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
    } catch {
      setError(t.feed.loadMoreFailed);
    } finally {
      setLoading(false);
    }
  }

  // Deliberately not auto-inserted: new posts arriving under the cursor make
  // the page jump while someone is reading. The pill hands the choice over.
  async function pullNewPosts() {
    setPulling(true);
    setError(null);
    try {
      const res = await fetch(endpoint(scope, null));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.posts);
      setCursor(data.nextCursor);
      // Moved synchronously rather than waiting for the effect: a poll firing
      // in between would still be comparing against the pre-pull timestamp.
      setSince(data.posts[0]?.createdAt ?? null);
      clearNewPosts();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(t.feed.refreshFailed);
    } finally {
      setPulling(false);
    }
  }

  async function changeScope(next: Scope) {
    if (next === scope) return;
    setScope(next);
    setSwitching(true);
    setError(null);
    try {
      const res = await fetch(endpoint(next, null));
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.posts);
      setCursor(data.nextCursor);
    } catch {
      setError(t.feed.switchFailed);
    } finally {
      setSwitching(false);
    }
  }

  const replace = (updated: FeedPost) =>
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const remove = (id: string) =>
    setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div>
      {showComposer ? (
        <PostComposer
          author={viewer}
          onCreated={(post) => setPosts((prev) => [post, ...prev])}
        />
      ) : null}

      {showScopeSwitch ? (
        <div className="flex border-b border-line" role="tablist">
          {(["all", "following"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={scope === value}
              onClick={() => changeScope(value)}
              className={cn(
                "relative flex-1 py-3 text-sm font-medium transition-colors",
                scope === value
                  ? "text-ink"
                  : "text-ink-faint hover:text-ink-muted",
              )}
            >
              {value === "all" ? t.feed.all : t.feed.following}
              {scope === value ? (
                <span className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-12 rounded-full bg-accent" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {showScopeSwitch && newPosts > 0 ? (
        <div className="sticky top-3 z-10 flex justify-center py-3">
          <button
            onClick={pullNewPosts}
            disabled={pulling}
            className="rounded-full bg-accent px-4 py-2 text-[0.8125rem] font-medium text-white shadow-lg shadow-ink/10 transition-colors hover:bg-accent-hover disabled:opacity-70"
          >
            {pulling
              ? t.feed.refreshing
              : `${t.feed.showNew} ${plural(locale, newPosts, t.feed.newPost)}`}
          </button>
        </div>
      ) : null}

      {switching ? (
        <FeedSkeleton count={4} label={t.feed.skeletonLabel} />
      ) : posts.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            title={emptyTitle ?? t.feed.emptyTitle}
            description={emptyDescription ?? t.feed.emptyDescription}
          />
        </div>
      ) : (
        <div className="thread divide-y divide-line">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onChange={replace}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {error ? (
        <p role="alert" className="py-4 text-center text-sm text-danger">
          {error}
        </p>
      ) : null}

      {cursor && !switching ? (
        <div className="py-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-60"
          >
            {loading ? t.feed.loading : t.feed.loadMore}
          </button>
        </div>
      ) : null}
    </div>
  );
}
