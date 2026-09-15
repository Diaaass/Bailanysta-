"use client";

import { useState } from "react";
import Link from "next/link";
import type { UserCard } from "@/lib/queries/users";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/LocaleProvider";

function FollowButton({ user }: { user: UserCard }) {
  const t = useT();
  const [following, setFollowing] = useState(user.followedByViewer);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      const res = await fetch(`/api/users/${user.username}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFollowing(data.following);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "shrink-0 rounded-full px-4 py-1.5 text-[0.8125rem] font-medium transition-colors disabled:opacity-60",
        following
          ? "border border-line text-ink hover:border-danger hover:text-danger"
          : "bg-accent text-white hover:bg-accent-hover",
      )}
    >
      {following ? t.profile.following : t.profile.follow}
    </button>
  );
}

export function UserList({
  users,
  emptyTitle,
  emptyDescription,
}: {
  users: UserCard[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (users.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {users.map((user) => (
        <li key={user.id} className="flex items-start gap-3 py-4">
          <Link href={`/profile/${user.username}`} className="shrink-0">
            <Avatar seed={user.avatarSeed} displayName={user.displayName} />
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${user.username}`}
              className="block text-[0.9375rem] font-semibold text-ink hover:underline"
            >
              {user.displayName}
            </Link>
            <p className="text-[0.8125rem] text-ink-faint">@{user.username}</p>
            {user.bio ? (
              <p className="mt-1 line-clamp-2 text-[0.875rem] leading-snug text-ink-muted">
                {user.bio}
              </p>
            ) : null}
          </div>

          {!user.isViewer ? <FollowButton user={user} /> : null}
        </li>
      ))}
    </ul>
  );
}
