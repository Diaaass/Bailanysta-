"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/queries/users";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { pluralWord } from "@/lib/i18n/plural";
import { format } from "@/lib/i18n/format";
import { monthYear } from "@/lib/i18n/time";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";

export function ProfileHeader({ profile }: { profile: Profile }) {
  const t = useT();
  const locale = useLocale();
  const [following, setFollowing] = useState(profile.followedByViewer);
  const [followers, setFollowers] = useState(profile.followerCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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
      setError(t.profile.followFailed);
    } finally {
      setBusy(false);
    }
  }

  const joined = monthYear(profile.createdAt, t);

  return (
    <header className="border-b border-line py-6">
      <div className="flex items-start justify-between gap-4">
        <Avatar
          seed={profile.avatarSeed}
          displayName={profile.displayName}
          size="lg"
        />

        {profile.isViewer ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-sunk"
          >
            {t.profile.edit}
          </button>
        ) : (
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
            {following ? t.profile.following : t.profile.follow}
          </button>
        )}
      </div>

      <h1 className="mt-4 text-[1.5rem] font-semibold leading-tight tracking-tight text-ink">
        {profile.displayName}
      </h1>
      <p className="text-[0.9375rem] text-ink-faint">@{profile.username}</p>

      {profile.bio ? (
        <p className="mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink">
          {profile.bio}
        </p>
      ) : profile.isViewer ? (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 text-[0.9375rem] text-accent hover:underline"
        >
          {t.profile.addBio}
        </button>
      ) : null}

      <dl className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[0.875rem]">
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">{t.profile.postsLabel}</dt>
          <dd className="font-semibold tabular-nums text-ink">
            {profile.postCount}
          </dd>
          <span className="text-ink-muted">
            {pluralWord(locale, profile.postCount, t.profile.posts)}
          </span>
        </div>
        <div>
          <dt className="sr-only">{t.profile.followersLabel}</dt>
          <dd>
            <Link
              href={`/profile/${profile.username}/followers`}
              className="flex items-baseline gap-1.5 hover:underline"
            >
              <span className="font-semibold tabular-nums text-ink">
                {followers}
              </span>
              <span className="text-ink-muted">
                {pluralWord(locale, followers, t.profile.followers)}
              </span>
            </Link>
          </dd>
        </div>
        <div>
          <dt className="sr-only">{t.profile.followsLabel}</dt>
          <dd>
            <Link
              href={`/profile/${profile.username}/following`}
              className="flex items-baseline gap-1.5 hover:underline"
            >
              <span className="font-semibold tabular-nums text-ink">
                {profile.followingCount}
              </span>
              <span className="text-ink-muted">
                {pluralWord(locale, profile.followingCount, t.profile.follows)}
              </span>
            </Link>
          </dd>
        </div>
        <span className="text-ink-faint">
          {format(t.profile.joined, { date: joined })}
        </span>
      </dl>

      {error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}

      {editing ? (
        <ProfileEditor
          initialDisplayName={profile.displayName}
          initialBio={profile.bio}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </header>
  );
}
