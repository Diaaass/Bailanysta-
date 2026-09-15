"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Action = {
  key: string;
  label: string;
  mode: "draft" | "improve" | "translate" | "hashtags";
  targetLang?: "kk" | "ru" | "en";
  needsText: boolean;
  apply: (current: string, result: string) => string;
};

const ACTIONS: Action[] = [
  {
    key: "improve",
    label: "Улучшить",
    mode: "improve",
    needsText: true,
    apply: (_, result) => result,
  },
  {
    key: "kk",
    label: "Қазақша",
    mode: "translate",
    targetLang: "kk",
    needsText: true,
    apply: (_, result) => result,
  },
  {
    key: "en",
    label: "English",
    mode: "translate",
    targetLang: "en",
    needsText: true,
    apply: (_, result) => result,
  },
  {
    key: "hashtags",
    label: "Хэштеги",
    mode: "hashtags",
    needsText: true,
    apply: (current, result) => `${current.trimEnd()}\n\n${result}`,
  },
];

export function AiAssist({
  content,
  onApply,
}: {
  content: string;
  onApply: (text: string) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasText = content.trim().length > 0;

  async function run(action: Action) {
    setPending(action.key);
    setError(null);
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: action.mode,
          text: content,
          targetLang: action.targetLang,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось обратиться к модели");
      }
      onApply(action.apply(content, data.result));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обратиться к модели");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {ACTIONS.map((action) => {
          const disabled = (action.needsText && !hasText) || pending !== null;
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => run(action)}
              disabled={disabled}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[0.75rem] font-medium transition-colors",
                pending === action.key
                  ? "border-accent text-accent"
                  : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                disabled && pending !== action.key && "opacity-40",
              )}
            >
              {pending === action.key ? "…" : action.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-[0.75rem] leading-snug text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
