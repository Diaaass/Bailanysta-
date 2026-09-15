import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getFeed, getPostById } from "@/lib/queries/posts";
import { getProfile, updateProfile } from "@/lib/queries/users";
import { searchPosts } from "@/lib/queries/search";
import { seedFixture, sql, trueCounts, truePostCounts, type Fixture } from "./fixtures";

let fx: Fixture;

beforeAll(async () => {
  fx = await seedFixture();
}, 60_000);

afterAll(async () => {
  await sql.end();
});

describe("getProfile", () => {
  // Regression: the correlated subqueries rendered without table qualification
  // in a join-less select, so "id" bound to the subquery's own table and every
  // post count came back as zero.
  it.each(["alice", "bolat", "chloe"])(
    "reports counters for %s that match plain SQL",
    async (username) => {
      const profile = await getProfile(username);
      expect(profile).not.toBeNull();

      const truth = await trueCounts(profile!.id);
      expect({
        posts: profile!.postCount,
        followers: profile!.followerCount,
        following: profile!.followingCount,
      }).toEqual(truth);
    },
  );

  it("counts posts, not zero", async () => {
    const profile = await getProfile("alice");
    expect(profile!.postCount).toBe(3);
  });

  it("marks the viewer's own profile", async () => {
    const own = await getProfile("alice", fx.users.alice);
    const other = await getProfile("alice", fx.users.bolat);
    expect(own!.isViewer).toBe(true);
    expect(other!.isViewer).toBe(false);
  });

  it("reports whether the viewer follows the profile", async () => {
    const followed = await getProfile("bolat", fx.users.alice);
    const notFollowed = await getProfile("chloe", fx.users.alice);
    expect(followed!.followedByViewer).toBe(true);
    expect(notFollowed!.followedByViewer).toBe(false);
  });

  it("is case-insensitive on the handle", async () => {
    expect(await getProfile("ALICE")).not.toBeNull();
  });

  it("returns null for an unknown handle", async () => {
    expect(await getProfile("nobody")).toBeNull();
  });
});

describe("getFeed pagination", () => {
  // Regression: the cursor is "<iso>|<id>", but the whole string was passed to
  // new Date(), producing Invalid Date, so the cursor was silently ignored and
  // every page returned the newest posts again.
  it("walks the whole feed without repeats or gaps", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < 10; page++) {
      const result: Awaited<ReturnType<typeof getFeed>> = await getFeed({
        limit: 2,
        cursor,
      });
      seen.push(...result.posts.map((p) => p.id));
      cursor = result.nextCursor;
      if (!cursor) break;
    }

    expect(cursor).toBeNull();
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(6);
  });

  it("keeps posts sharing a timestamp distinct across pages", async () => {
    const first = await getFeed({ limit: 4 });
    const second = await getFeed({ limit: 4, cursor: first.nextCursor });

    const ids = [...first.posts, ...second.posts].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(fx.posts.a2);
    expect(ids).toContain(fx.posts.a3);
  });

  it("orders newest first", async () => {
    const { posts } = await getFeed({ limit: 10 });
    const times = posts.map((p) => new Date(p.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("stops paginating when the feed is exhausted", async () => {
    const { nextCursor } = await getFeed({ limit: 50 });
    expect(nextCursor).toBeNull();
  });
});

describe("getFeed counters and flags", () => {
  it("matches like and comment counts computed with plain SQL", async () => {
    const { posts } = await getFeed({ limit: 50 });
    for (const post of posts) {
      const truth = await truePostCounts(post.id);
      expect({ likes: post.likeCount, comments: post.commentCount }).toEqual(
        truth,
      );
    }
  });

  it("sets likedByViewer only for the viewer's own likes", async () => {
    const asAlice = await getFeed({ limit: 50, viewerId: fx.users.alice });
    const asBolat = await getFeed({ limit: 50, viewerId: fx.users.bolat });

    const liked = (feed: typeof asAlice) =>
      feed.posts.filter((p) => p.likedByViewer).map((p) => p.id).sort();

    expect(liked(asAlice)).toEqual([fx.posts.b1, fx.posts.b2].sort());
    expect(liked(asBolat)).toEqual([]);
  });

  it("sets ownedByViewer for the author only", async () => {
    const { posts } = await getFeed({ limit: 50, viewerId: fx.users.alice });
    const own = posts.filter((p) => p.ownedByViewer).map((p) => p.id).sort();
    expect(own).toEqual([fx.posts.a1, fx.posts.a2, fx.posts.a3].sort());
  });

  it("reports no viewer flags for anonymous readers", async () => {
    const { posts } = await getFeed({ limit: 50 });
    expect(posts.every((p) => !p.likedByViewer && !p.ownedByViewer)).toBe(true);
  });

  it("does not mark untouched posts as edited", async () => {
    const { posts } = await getFeed({ limit: 50 });
    expect(posts.every((p) => p.edited === false)).toBe(true);
  });
});

describe("getFeed filters", () => {
  it("limits to one author", async () => {
    const { posts } = await getFeed({ limit: 50, authorId: fx.users.alice });
    expect(posts).toHaveLength(3);
    expect(posts.every((p) => p.author.username === "alice")).toBe(true);
  });

  it("returns only followed authors for scope=following", async () => {
    const { posts } = await getFeed({
      limit: 50,
      viewerId: fx.users.alice,
      scope: "following",
    });
    expect(posts.map((p) => p.author.username)).toEqual(["bolat", "bolat"]);
  });

  it("returns nothing when the viewer follows nobody", async () => {
    const { posts } = await getFeed({
      limit: 50,
      viewerId: fx.users.bolat,
      scope: "following",
    });
    expect(posts).toHaveLength(0);
  });
});

describe("getPostById", () => {
  it("returns the post with its author", async () => {
    const post = await getPostById(fx.posts.a1, fx.users.alice);
    expect(post?.author.username).toBe("alice");
    expect(post?.commentCount).toBe(2);
    expect(post?.ownedByViewer).toBe(true);
  });

  it("returns null for a missing id", async () => {
    expect(
      await getPostById("00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });
});

describe("searchPosts", () => {
  it("finds a literal substring", async () => {
    const { results } = await searchPosts("ANALYZE");
    expect(results.map((r) => r.id)).toContain(fx.posts.a1);
  });

  it("is case-insensitive", async () => {
    const { results } = await searchPosts("analyze");
    expect(results.map((r) => r.id)).toContain(fx.posts.a1);
  });

  it("finds hashtags", async () => {
    const { results } = await searchPosts("#postgres");
    expect(results.map((r) => r.id)).toContain(fx.posts.a1);
  });

  it("matches Kazakh text", async () => {
    const { results } = await searchPosts("Оқуды");
    expect(results.map((r) => r.id)).toContain(fx.posts.b2);
  });

  it("returns nothing for an empty query", async () => {
    const outcome = await searchPosts("   ");
    expect(outcome.results).toHaveLength(0);
  });

  it("treats wildcards as literal characters", async () => {
    // "%" must not turn into "match everything"
    const { results } = await searchPosts("%");
    expect(results).toHaveLength(0);
  });
});

describe("searchPosts pagination", () => {
  // Every fixture post contains a vowel, so this matches the whole corpus and
  // gives pagination something to walk through.
  const BROAD = "о";

  it("splits results into pages without repeats or gaps", async () => {
    const seen: string[] = [];
    let offset = 0;

    for (let page = 0; page < 10; page++) {
      const outcome = await searchPosts(BROAD, null, { limit: 2, offset });
      seen.push(...outcome.results.map((r) => r.id));
      if (outcome.nextOffset === null) break;
      offset = outcome.nextOffset;
    }

    expect(new Set(seen).size).toBe(seen.length);

    const all = await searchPosts(BROAD, null, { limit: 100 });
    expect(seen.sort()).toEqual(all.results.map((r) => r.id).sort());
  });

  it("reports hasMore only while pages remain", async () => {
    const first = await searchPosts(BROAD, null, { limit: 1 });
    expect(first.hasMore).toBe(true);
    expect(first.nextOffset).toBe(1);

    const everything = await searchPosts(BROAD, null, { limit: 100 });
    expect(everything.hasMore).toBe(false);
    expect(everything.nextOffset).toBeNull();
  });

  it("keeps ranking stable across pages", async () => {
    const whole = await searchPosts(BROAD, null, { limit: 100 });
    const firstPage = await searchPosts(BROAD, null, { limit: 3, offset: 0 });
    const secondPage = await searchPosts(BROAD, null, { limit: 3, offset: 3 });

    expect([...firstPage.results, ...secondPage.results].map((r) => r.id)).toEqual(
      whole.results.slice(0, 6).map((r) => r.id),
    );
  });

  it("returns an empty page past the end", async () => {
    const outcome = await searchPosts(BROAD, null, { limit: 5, offset: 500 });
    expect(outcome.results).toHaveLength(0);
    expect(outcome.hasMore).toBe(false);
  });
});

describe("updateProfile", () => {
  it("persists a new display name and bio", async () => {
    const updated = await updateProfile(fx.users.chloe, {
      displayName: "Хлоя Мартен",
      bio: "Продуктовый дизайнер",
    });
    expect(updated?.displayName).toBe("Хлоя Мартен");

    const profile = await getProfile("chloe");
    expect(profile?.displayName).toBe("Хлоя Мартен");
    expect(profile?.bio).toBe("Продуктовый дизайнер");
  });

  it("returns null for an unknown user", async () => {
    expect(
      await updateProfile("00000000-0000-0000-0000-000000000000", {
        displayName: "x",
        bio: "",
      }),
    ).toBeNull();
  });
});
