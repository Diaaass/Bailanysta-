"use client";

import { useState } from "react";
import type { Profile } from "@/lib/queries/users";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const [following, setFollowing] = useState(profile.followedByViewer);
  const [followers, setFollowers] = useState(profile.followerCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFollow() {
    const next = !following;
    setBusy(true);
    setError(null);
    setFollowing(next);
    setFollowers((n) => n + (next ? 1 : -1));

    try {
      const res = await fetch(`/api/users/${profile.username}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFollowing(data.following);
      setFollowers(data.followerCount);
    } catch {
      setFollowing(!next);
      setFollowers((n) => n + (next ? -1 : 1));
      setError("Не удалось изменить подписку");
    } finally {
      setBusy(false);
    }
  }

  const joined = new Intl.DateTimeFormat("ru", {
    month: "long",
    year: "numeric",
  }).format(new Date(profile.createdAt));

  return (
    <header className="border-b border-line py-6">
      <div className="flex items-start justify-between gap-4">
        <Avatar
          seed={profile.avatarSeed}
          displayName={profile.displayName}
          size="lg"
        />

        {!profile.isViewer ? (
          <button
            onClick={toggleFollow}
            disabled={busy}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:opacity-60",
              following
                ? "border border-line text-ink hover:border-danger hover:text-danger"
                : "bg-accent text-white hover:bg-accent-hover",
            )}
          >
            {following ? "Вы подписаны" : "Подписаться"}
          </button>
        ) : null}
      </div>

      <h1 className="mt-4 text-[1.5rem] font-semibold leading-tight tracking-tight text-ink">
        {profile.displayName}
      </h1>
      <p className="text-[0.9375rem] text-ink-faint">@{profile.username}</p>

      {profile.bio ? (
        <p className="mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink">
          {profile.bio}
        </p>
      ) : null}

      <dl className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[0.875rem]">
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Постов</dt>
          <dd className="font-semibold tabular-nums text-ink">
            {profile.postCount}
          </dd>
          <span className="text-ink-muted">постов</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Подписчиков</dt>
          <dd className="font-semibold tabular-nums text-ink">{followers}</dd>
          <span className="text-ink-muted">подписчиков</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Подписок</dt>
          <dd className="font-semibold tabular-nums text-ink">
            {profile.followingCount}
          </dd>
          <span className="text-ink-muted">подписок</span>
        </div>
        <span className="text-ink-faint">на Bailanysta с {joined}</span>
      </dl>

      {error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </header>
  );
}
