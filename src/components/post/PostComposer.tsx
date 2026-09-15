"use client";

import { useRef, useState } from "react";
import type { FeedPost } from "@/lib/queries/posts";
import { Avatar } from "@/components/ui/Avatar";
import { postContentSchema } from "@/lib/validation";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { cn } from "@/lib/utils";
import { AiAssist } from "@/components/post/AiAssist";
import { useT } from "@/components/i18n/LocaleProvider";

const LIMIT = 500;

export function PostComposer({
  author,
  onCreated,
}: {
  author: { displayName: string; avatarSeed: string };
  onCreated: (post: FeedPost) => void;
}) {
  const t = useT();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const remaining = LIMIT - content.length;
  const canSubmit = content.trim().length > 0 && remaining >= 0 && !busy;

  async function submit() {
    const parsed = postContentSchema.safeParse(content);
    if (!parsed.success) {
      setError(translateIssue(parsed.error.issues[0]?.message, t));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: parsed.data }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "");
      }
      const data = await res.json();
      onCreated(data.post);
      setContent("");
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : t.composer.failed,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-3 border-b border-line py-5 sm:gap-3.5">
      <Avatar seed={author.avatarSeed} displayName={author.displayName} />

      <div className="min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
              void submit();
            }
          }}
          rows={2}
          placeholder={t.composer.placeholder}
          aria-label={t.composer.label}
          className="w-full resize-none bg-transparent text-[1.0625rem] leading-[1.55] text-ink outline-none placeholder:text-ink-faint"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AiAssist
            content={content}
            onApply={(text) => {
              setContent(text);
              textareaRef.current?.focus();
            }}
          />

          <div className="ml-auto flex items-center gap-3">
            <span
              className={cn(
                "text-[0.8125rem] tabular-nums",
                remaining < 0
                  ? "text-danger"
                  : remaining <= 50
                    ? "text-ember"
                    : "text-ink-faint",
              )}
            >
              {remaining}
            </span>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-faint"
            >
              {busy ? t.composer.publishing : t.composer.publish}
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
