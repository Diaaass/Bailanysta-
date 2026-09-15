import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type TrendingTag = { tag: string; count: number };

export type SuggestedPerson = {
  username: string;
  displayName: string;
  avatarSeed: string;
  bio: string;
  postCount: number;
};

/**
 * Tags are parsed out of the post text on read rather than stored in their own
 * table. At this size that keeps writes simple and there is nothing to keep in
 * sync; a tags table earns its place once the corpus outgrows a sequential
 * scan over recent posts.
 */
export async function getTrendingTags(limit = 6): Promise<TrendingTag[]> {
  const rows = await db.execute<{ tag: string; n: number }>(sql`
    SELECT lower(tag) AS tag, count(*)::int AS n
    FROM posts p
    CROSS JOIN LATERAL regexp_matches(p.content, '#[[:alnum:]_]+', 'g') AS m(parts)
    CROSS JOIN LATERAL unnest(m.parts) AS tag
    WHERE p.created_at > now() - interval '60 days'
    GROUP BY 1
    ORDER BY n DESC, tag ASC
    LIMIT ${limit}
  `);

  return [...rows].map((row) => ({ tag: row.tag, count: Number(row.n) }));
}

export async function getSuggestedPeople(
  viewerId: string,
  limit = 3,
): Promise<SuggestedPerson[]> {
  const rows = await db.execute<{
    username: string;
    display_name: string;
    avatar_seed: string;
    bio: string;
    n: number;
  }>(sql`
    SELECT u.username, u.display_name, u.avatar_seed, u.bio,
           count(p.id)::int AS n
    FROM users u
    LEFT JOIN posts p ON p.author_id = u.id
    WHERE u.id <> ${viewerId}
      AND NOT EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = ${viewerId} AND f.following_id = u.id
      )
    GROUP BY u.id
    HAVING count(p.id) > 0
    ORDER BY n DESC, u.created_at DESC
    LIMIT ${limit}
  `);

  return [...rows].map((row) => ({
    username: row.username,
    displayName: row.display_name,
    avatarSeed: row.avatar_seed,
    bio: row.bio,
    postCount: Number(row.n),
  }));
}
