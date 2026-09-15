import postgres from "postgres";

export const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

export type Fixture = {
  users: Record<string, string>;
  posts: Record<string, string>;
};

const PASSWORD_HASH = "$2b$10$notarealhashusedonlyintests000000000000000000000000";

/**
 * Rebuilds a small, fully deterministic dataset.
 *
 * Two of Aigerim's posts deliberately share `created_at` so pagination has to
 * fall back to the id tie-break; without it a cursor would skip or repeat one
 * of them.
 */
export async function seedFixture(): Promise<Fixture> {
  await sql`TRUNCATE notifications, follows, likes, comments, posts, users RESTART IDENTITY CASCADE`;

  const users: Record<string, string> = {};
  for (const [username, displayName, bio] of [
    ["alice", "Alice Nurlan", "Backend engineer"],
    ["bolat", "Болат Ермеков", ""],
    ["chloe", "Chloe Martin", "Designer"],
  ] as const) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO users (username, display_name, password_hash, bio, avatar_seed)
      VALUES (${username}, ${displayName}, ${PASSWORD_HASH}, ${bio}, ${username})
      RETURNING id
    `;
    users[username] = row.id;
  }

  const posts: Record<string, string> = {};
  const rows: [string, string, string][] = [
    // key, author, created_at
    ["a1", "alice", "2026-09-10T10:00:00Z"],
    ["a2", "alice", "2026-09-10T11:00:00Z"],
    ["a3", "alice", "2026-09-10T11:00:00Z"], // same timestamp as a2 on purpose
    ["b1", "bolat", "2026-09-10T12:00:00Z"],
    ["b2", "bolat", "2026-09-10T13:00:00Z"],
    ["c1", "chloe", "2026-09-10T14:00:00Z"],
  ];

  const CONTENT: Record<string, string> = {
    a1: "Индекс без ANALYZE — просто украшение в схеме. #postgres",
    a2: "Переписал выборку на курсорную пагинацию.",
    a3: "Ещё один пост с той же секундой создания.",
    b1: "Бүгін кездесу болды, рақмет барлығына!",
    b2: "Оқуды бітіргелі бір жыл болды. #оқу",
    c1: "Skeleton screens beat spinners almost every time.",
  };

  for (const [key, author, createdAt] of rows) {
    const [row] = await sql<{ id: string }[]>`
      INSERT INTO posts (author_id, content, created_at, updated_at)
      VALUES (${users[author]}, ${CONTENT[key]}, ${createdAt}, ${createdAt})
      RETURNING id
    `;
    posts[key] = row.id;
  }

  // alice likes two of bolat's posts, chloe likes one of alice's
  await sql`INSERT INTO likes (user_id, post_id) VALUES (${users.alice}, ${posts.b1})`;
  await sql`INSERT INTO likes (user_id, post_id) VALUES (${users.alice}, ${posts.b2})`;
  await sql`INSERT INTO likes (user_id, post_id) VALUES (${users.chloe}, ${posts.a1})`;

  await sql`INSERT INTO comments (post_id, author_id, content) VALUES (${posts.a1}, ${users.bolat}, 'Согласен')`;
  await sql`INSERT INTO comments (post_id, author_id, content) VALUES (${posts.a1}, ${users.chloe}, 'Nice')`;

  // alice follows bolat; nobody follows chloe
  await sql`INSERT INTO follows (follower_id, following_id) VALUES (${users.alice}, ${users.bolat})`;
  await sql`INSERT INTO follows (follower_id, following_id) VALUES (${users.chloe}, ${users.bolat})`;

  return { users, posts };
}

/** Ground truth computed with plain SQL, independent of the query layer. */
export async function trueCounts(userId: string) {
  const [row] = await sql<
    { posts: number; followers: number; following: number }[]
  >`
    SELECT
      (SELECT count(*)::int FROM posts WHERE author_id = ${userId}) AS posts,
      (SELECT count(*)::int FROM follows WHERE following_id = ${userId}) AS followers,
      (SELECT count(*)::int FROM follows WHERE follower_id = ${userId}) AS following
  `;
  return row;
}

export async function truePostCounts(postId: string) {
  const [row] = await sql<{ likes: number; comments: number }[]>`
    SELECT
      (SELECT count(*)::int FROM likes WHERE post_id = ${postId}) AS likes,
      (SELECT count(*)::int FROM comments WHERE post_id = ${postId}) AS comments
  `;
  return row;
}
