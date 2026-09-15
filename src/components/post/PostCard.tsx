"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeedPost } from "@/lib/queries/posts";
import { Avatar } from "@/components/ui/Avatar";
import { PostContent } from "@/components/post/PostContent";
import { absoluteTime, cn, relativeTime } from "@/lib/utils";
import { postContentSchema } from "@/lib/validation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LanguageBadge } from "@/components/ui/LanguageBadge";

type Props = {
  post: FeedPost;
  onChange?: (post: FeedPost) => void;
  onDelete?: (id: string) => void;
};

export function PostCard({ post, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function toggleLike() {
    const next = !post.likedByViewer;
    // Optimistic: the count moves immediately, then reconciles with whatever
    // the server reports so concurrent likes do not drift.
    onChange?.({
      ...post,
      likedByViewer: next,
      likeCount: post.likeCount + (next ? 1 : -1),
    });

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onChange?.({
        ...post,
        likedByViewer: data.liked,
        likeCount: data.likeCount,
      });
    } catch {
      onChange?.(post);
      setError("Не удалось сохранить лайк");
    }
  }

  async function saveEdit() {
    const parsed = postContentSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте текст поста");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: parsed.data }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onChange?.(data.post);
      setEditing(false);
    } catch {
      setError("Не удалось сохранить изменения");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDelete?.(post.id);
    } catch {
      setError("Не удалось удалить пост");
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <article className="flex gap-3 py-5 pr-1 sm:gap-3.5">
      {/* z-index lifts the avatar above the thread line drawn by .thread::before */}
      <Link href={`/profile/${post.author.username}`} className="relative z-10 shrink-0">
        <Avatar
          seed={post.author.avatarSeed}
          displayName={post.author.displayName}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={`/profile/${post.author.username}`}
            className="text-[0.9375rem] font-semibold text-ink hover:underline"
          >
            {post.author.displayName}
          </Link>
          <span className="text-[0.8125rem] text-ink-faint">
            @{post.author.username}
          </span>
          <Link
            href={`/post/${post.id}`}
            title={absoluteTime(post.createdAt)}
            className="text-[0.8125rem] text-ink-faint hover:underline"
          >
            {relativeTime(post.createdAt)}
          </Link>
          {post.edited ? (
            <span className="text-[0.8125rem] text-ink-faint">изменено</span>
          ) : null}
          {post.lang ? (
            <LanguageBadge lang={post.lang} />
          ) : null}
        </div>

        <div className="mt-1.5">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[0.9375rem] leading-[1.6] text-ink outline-none focus:border-accent"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  disabled={busy}
                  className="rounded-full bg-accent px-3.5 py-1.5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft(post.content);
                    setError(null);
                  }}
                  className="rounded-full px-3 py-1.5 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <PostContent content={post.content} />
          )}
        </div>

        <div className="mt-3 flex items-center gap-1">
          <button
            onClick={toggleLike}
            aria-pressed={post.likedByViewer}
            aria-label={post.likedByViewer ? "Убрать лайк" : "Поставить лайк"}
            className={cn(
              "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[0.8125rem] transition-colors",
              post.likedByViewer
                ? "text-ember"
                : "text-ink-faint hover:text-ember",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-[1.1rem] w-[1.1rem]"
              fill={post.likedByViewer ? "currentColor" : "none"}
            >
              <path
                d="M12 20.3l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.49L12 20.3z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span className="tabular-nums">{post.likeCount || ""}</span>
          </button>

          <Link
            href={`/post/${post.id}`}
            className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[0.8125rem] text-ink-faint transition-colors hover:text-accent"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="h-[1.1rem] w-[1.1rem]"
            >
              <path
                d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="tabular-nums">{post.commentCount || ""}</span>
          </Link>

          {post.ownedByViewer && !editing ? (
            <div className="ml-auto flex items-center gap-0.5">
              <button
                onClick={() => setEditing(true)}
                className="rounded-full px-2.5 py-1 text-[0.8125rem] text-ink-faint transition-colors hover:text-ink"
              >
                Изменить
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className="rounded-full px-2.5 py-1 text-[0.8125rem] text-ink-faint transition-colors hover:text-danger disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
            {error}
          </p>
        ) : null}

        {confirmingDelete ? (
          <ConfirmDialog
            title="Удалить пост?"
            description="Пост исчезнет из ленты и из поиска вместе с лайками и комментариями. Отменить это нельзя."
            confirmLabel="Удалить"
            busy={busy}
            onConfirm={remove}
            onCancel={() => setConfirmingDelete(false)}
          />
        ) : null}
      </div>
    </article>
  );
}
