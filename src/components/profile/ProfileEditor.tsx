"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { profileUpdateSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

const BIO_LIMIT = 280;

export function ProfileEditor({
  initialDisplayName,
  initialBio,
  onClose,
}: {
  initialDisplayName: string;
  initialBio: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("input")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const remaining = BIO_LIMIT - bio.length;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse({ displayName, bio });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Проверьте поля");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось сохранить профиль");
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить профиль");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
        className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 sm:rounded-2xl"
      >
        <h2
          id="edit-profile-title"
          className="text-[1.125rem] font-semibold tracking-tight text-ink"
        >
          Изменить профиль
        </h2>

        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="block text-[0.8125rem] font-medium text-ink"
            >
              Имя
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
              className="mt-1.5 w-full rounded-lg border border-line bg-surface-sunk px-3 py-2.5 text-[0.9375rem] text-ink outline-none transition-colors focus:border-accent"
            />
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-[0.8125rem] font-medium text-ink"
            >
              О себе
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={BIO_LIMIT}
              placeholder="Чем занимаетесь, о чём пишете"
              className="mt-1.5 w-full resize-none rounded-lg border border-line bg-surface-sunk px-3 py-2.5 text-[0.9375rem] leading-relaxed text-ink outline-none transition-colors focus:border-accent placeholder:text-ink-faint"
            />
            <p
              className={cn(
                "mt-1 text-right text-[0.75rem] tabular-nums",
                remaining <= 20 ? "text-ember" : "text-ink-faint",
              )}
            >
              {remaining}
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[0.8125rem] text-danger"
            >
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-faint"
            >
              {busy ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
