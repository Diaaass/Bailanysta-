"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { commentContentSchema } from "@/lib/validation";
import { absoluteTime, relativeTime } from "@/lib/utils";

export type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarSeed: string;
  };
};

export function CommentThread({
  postId,
  initialComments,
  viewer,
}: {
  postId: string;
  initialComments: CommentItem[];
  viewer: { displayName: string; avatarSeed: string };
}) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = commentContentSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте текст");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: parsed.data }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setDraft("");
    } catch {
      setError("Комментарий не отправился. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Комментарии">
      <form onSubmit={submit} className="flex gap-3 border-b border-line py-5">
        <Avatar
          seed={viewer.avatarSeed}
          displayName={viewer.displayName}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Пікір қалдырыңыз… Напишите комментарий…"
            aria-label="Текст комментария"
            className="w-full resize-none bg-transparent text-[0.9375rem] leading-[1.55] text-ink outline-none placeholder:text-ink-faint"
          />
          <div className="mt-1 flex items-center justify-end gap-3">
            <span className="text-[0.8125rem] tabular-nums text-ink-faint">
              {300 - draft.length}
            </span>
            <button
              type="submit"
              disabled={busy || draft.trim().length === 0}
              className="rounded-full bg-accent px-4 py-1.5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-faint"
            >
              {busy ? "Отправка…" : "Ответить"}
            </button>
          </div>
          {error ? (
            <p role="alert" className="mt-1 text-[0.8125rem] text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-faint">
          Комментариев пока нет. Ваш будет первым.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 py-4">
              <Link href={`/profile/${comment.author.username}`} className="shrink-0">
                <Avatar
                  seed={comment.author.avatarSeed}
                  displayName={comment.author.displayName}
                  size="sm"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/profile/${comment.author.username}`}
                    className="text-[0.875rem] font-semibold text-ink hover:underline"
                  >
                    {comment.author.displayName}
                  </Link>
                  <span className="text-[0.8125rem] text-ink-faint">
                    @{comment.author.username}
                  </span>
                  <span
                    title={absoluteTime(comment.createdAt)}
                    className="text-[0.8125rem] text-ink-faint"
                  >
                    {relativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-[0.9375rem] leading-[1.55] text-ink">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
