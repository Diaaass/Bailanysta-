import Link from "next/link";
import { cn } from "@/lib/utils";
import { getTranslations } from "@/lib/i18n";

export async function ConnectionsHeader({
  username,
  active,
}: {
  username: string;
  active: "followers" | "following";
}) {
  const { t } = await getTranslations();

  const tabs = [
    { key: "followers", label: t.profile.followersTab },
    { key: "following", label: t.profile.followsTab },
  ] as const;

  return (
    <div className="border-b border-line">
      <div className="flex items-center gap-3 py-4">
        <Link
          href={`/profile/${username}`}
          className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-sunk hover:text-ink"
          aria-label={t.profile.backToProfile}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="text-[1.0625rem] font-semibold text-ink">@{username}</h1>
      </div>

      <div className="flex" role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/profile/${username}/${tab.key}`}
            role="tab"
            aria-selected={active === tab.key}
            className={cn(
              "relative flex-1 py-3 text-center text-sm font-medium transition-colors",
              active === tab.key
                ? "text-ink"
                : "text-ink-faint hover:text-ink-muted",
            )}
          >
            {tab.label}
            {active === tab.key ? (
              <span className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-16 rounded-full bg-accent" />
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
