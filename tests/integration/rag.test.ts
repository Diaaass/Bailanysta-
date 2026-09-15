import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { seedFixture, sql, type Fixture } from "./fixtures";

const DIMENSIONS = 1536;

/** Deterministic unit-ish vector so tests never depend on a live model. */
function fakeVector(seed: number) {
  const out = new Array<number>(DIMENSIONS);
  let x = seed || 1;
  for (let i = 0; i < DIMENSIONS; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out[i] = x / 2147483648 - 0.5;
  }
  return out;
}

// The model is stubbed; the pgvector query underneath is real, so the SQL -
// including the author scoping this endpoint depends on - is what gets tested.
vi.mock("@/lib/ai/client", () => ({
  isEmbeddingConfigured: () => true,
  isAiConfigured: () => true,
  embed: async () => fakeVector(42),
  chat: async () => "stubbed",
  AiUnavailableError: class extends Error {},
}));

const { retrieveOwnPosts } = await import("@/lib/ai/rag");

let fx: Fixture;
let oldPostId: string;

beforeAll(async () => {
  fx = await seedFixture();

  // Far outside the recent window: only semantic retrieval can surface it.
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO posts (author_id, content, created_at, updated_at)
    VALUES (
      ${fx.users.alice},
      'Старый пост про репликацию PostgreSQL и отказоустойчивость.',
      NOW() - INTERVAL '120 days',
      NOW() - INTERVAL '120 days'
    )
    RETURNING id
  `;
  oldPostId = row.id;

  // Every post gets an embedding, including other people's, so the author
  // filter is the only thing keeping foreign posts out.
  const all = await sql<{ id: string }[]>`SELECT id FROM posts ORDER BY created_at`;
  for (const [i, post] of all.entries()) {
    await sql`
      UPDATE posts SET embedding = ${`[${fakeVector(i + 1).join(",")}]`}::vector
      WHERE id = ${post.id}
    `;
  }
}, 120_000);

afterAll(async () => {
  await sql.end();
});

describe("retrieveOwnPosts with the vector path active", () => {
  it("reaches past the recent window through semantic retrieval", async () => {
    const sources = await retrieveOwnPosts(fx.users.alice, "репликация");
    const found = sources.find((s) => s.id === oldPostId);

    expect(found, "the 120-day-old post should be retrieved").toBeDefined();
    expect(found!.retrievedBy).toBe("semantic");
  });

  it("never returns another user's posts, even though they are indexed", async () => {
    const sources = await retrieveOwnPosts(fx.users.alice, "что я писал");
    const ids = sources.map((s) => s.id);

    for (const foreign of [fx.posts.b1, fx.posts.b2, fx.posts.c1]) {
      expect(ids).not.toContain(foreign);
    }
  });

  it("returns only the author's posts for every seeded user", async () => {
    for (const [username, userId] of Object.entries(fx.users)) {
      const sources = await retrieveOwnPosts(userId, "тест");
      const authors = await sql<{ username: string }[]>`
        SELECT u.username FROM posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.id = ANY(${sources.map((s) => s.id)}::uuid[])
      `;
      expect(new Set(authors.map((a) => a.username))).toEqual(
        sources.length ? new Set([username]) : new Set(),
      );
    }
  });

  it("keeps recent posts labelled as recent", async () => {
    const sources = await retrieveOwnPosts(fx.users.alice, "пагинация");
    const a1 = sources.find((s) => s.id === fx.posts.a1);
    expect(a1?.retrievedBy).toBe("recent");
  });

  it("returns nothing for an author without posts", async () => {
    const [ghost] = await sql<{ id: string }[]>`
      INSERT INTO users (username, display_name, password_hash, avatar_seed)
      VALUES ('ghost', 'Ghost', 'x', 'ghost')
      RETURNING id
    `;
    expect(await retrieveOwnPosts(ghost.id, "что угодно")).toHaveLength(0);
  });

  it("orders sources newest first", async () => {
    const sources = await retrieveOwnPosts(fx.users.alice, "постгрес");
    const times = sources.map((s) => new Date(s.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });
});
