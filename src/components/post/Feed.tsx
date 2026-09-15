"use client";

import { useCallback, useState } from "react";
import type { FeedPost } from "@/lib/queries/posts";
import { PostCard } from "@/components/post/PostCard";
import { PostComposer } from "@/components/post/PostComposer";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

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
  emptyTitle = "Здесь пока пусто",
  emptyDescription = "Напишите первый пост — он появится в ленте сразу.",
}: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [scope, setScope] = useState<Scope>("all");
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Не удалось загрузить ещё посты");
    } finally {
      setLoading(false);
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
      setError("Не удалось переключить ленту");
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
          {(
            [
              ["all", "Все"],
              ["following", "Подписки"],
            ] as const
          ).map(([value, label]) => (
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
              {label}
              {scope === value ? (
                <span className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-12 rounded-full bg-accent" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {switching ? (
        <FeedSkeleton count={4} />
      ) : posts.length === 0 ? (
        <div className="pt-6">
          <EmptyState title={emptyTitle} description={emptyDescription} />
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
            {loading ? "Загрузка…" : "Показать ещё"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
