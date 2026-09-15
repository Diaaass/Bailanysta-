import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { getNotifications, markAllRead } from "@/lib/queries/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Уведомления" };

const VERB = {
  like: "оценил ваш пост",
  comment: "прокомментировал ваш пост",
  follow: "подписался на вас",
} as const;

export default async function NotificationsPage() {
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  const items = await getNotifications(viewer.id);

  // Opening the page is the acknowledgement, so the badge clears here rather
  // than behind a separate "mark as read" control.
  await markAllRead(viewer.id);

  return (
    <div className="px-4 lg:px-0">
      <h1 className="border-b border-line py-5 text-[1.25rem] font-semibold tracking-tight text-ink">
        Уведомления
      </h1>

      {items.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            title="Пока тихо"
            description="Здесь появятся лайки, комментарии и новые подписчики."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => {
            const body = (
              <div className="flex gap-3 py-4">
                <Avatar
                  seed={item.actor.avatarSeed}
                  displayName={item.actor.displayName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] leading-snug text-ink">
                    <span className="font-semibold">
                      {item.actor.displayName}
                    </span>{" "}
                    <span className="text-ink-muted">{VERB[item.type]}</span>
                  </p>
                  {item.postExcerpt ? (
                    <p className="mt-1 truncate text-[0.875rem] text-ink-faint">
                      {item.postExcerpt}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[0.8125rem] text-ink-faint">
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
                {!item.isRead ? (
                  <span
                    aria-label="Новое"
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                  />
                ) : null}
              </div>
            );

            return (
              <li key={item.id}>
                {item.postId ? (
                  <Link
                    href={`/post/${item.postId}`}
                    className="block transition-colors hover:bg-surface-sunk"
                  >
                    {body}
                  </Link>
                ) : (
                  <Link
                    href={`/profile/${item.actor.username}`}
                    className="block transition-colors hover:bg-surface-sunk"
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
