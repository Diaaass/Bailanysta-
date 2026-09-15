import Link from "next/link";
import { getSuggestedPeople, getTrendingTags } from "@/lib/queries/discover";
import { Avatar } from "@/components/ui/Avatar";
import { plural } from "@/lib/utils";

export async function DiscoverRail({ viewerId }: { viewerId: string }) {
  const [tags, people] = await Promise.all([
    getTrendingTags(),
    getSuggestedPeople(viewerId),
  ]);

  if (tags.length === 0 && people.length === 0) return null;

  return (
    <aside className="hidden w-72 shrink-0 py-7 xl:block">
      <div className="sticky top-7 space-y-7">
        {tags.length > 0 ? (
          <section>
            <h2 className="px-1 text-[0.8125rem] font-medium text-ink-muted">
              О чём пишут
            </h2>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li key={tag.tag}>
                  <Link
                    href={`/search?q=${encodeURIComponent(tag.tag)}`}
                    className="inline-flex items-baseline gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.8125rem] text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    {tag.tag}
                    <span className="text-[0.6875rem] tabular-nums text-ink-faint">
                      {tag.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {people.length > 0 ? (
          <section>
            <h2 className="px-1 text-[0.8125rem] font-medium text-ink-muted">
              Кого почитать
            </h2>
            <ul className="mt-2.5 space-y-1">
              {people.map((person) => (
                <li key={person.username}>
                  <Link
                    href={`/profile/${person.username}`}
                    className="flex items-start gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-surface-sunk"
                  >
                    <Avatar
                      seed={person.avatarSeed}
                      displayName={person.displayName}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-ink">
                        {person.displayName}
                      </span>
                      <span className="block truncate text-[0.75rem] text-ink-faint">
                        {plural(person.postCount, "пост", "поста", "постов")}
                        {person.bio ? ` · ${person.bio}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="px-1 text-[0.75rem] leading-relaxed text-ink-faint">
          Поиск здесь понимает смысл: запрос на казахском находит русские и
          английские посты о том же.
        </p>
      </div>
    </aside>
  );
}
