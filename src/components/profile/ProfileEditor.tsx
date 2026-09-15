"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { profileUpdateSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { useT } from "@/components/i18n/LocaleProvider";
import { translateIssue } from "@/lib/i18n/translate-issue";

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
  const t = useT();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();


  const remaining = BIO_LIMIT - bio.length;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse({ displayName, bio });
    if (!parsed.success) {
      setError(translateIssue(parsed.error.issues[0]?.message, t));
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
        throw new Error(data?.error ?? t.profile.saveFailed);
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.profile.saveFailed);
      setBusy(false);
    }
  }

  return (
    <Modal title={t.profile.editTitle} titleId={titleId} onClose={onClose}>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="block text-[0.8125rem] font-medium text-ink"
          >
            {t.profile.name}
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
            {t.profile.bio}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={BIO_LIMIT}
            placeholder={t.profile.bioPlaceholder}
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
            {t.post.cancel}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:bg-line-strong disabled:text-ink-faint"
          >
            {busy ? t.profile.saving : t.post.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}
