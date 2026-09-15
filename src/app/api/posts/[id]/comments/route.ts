import type { NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, notifications, posts, users } from "@/lib/db/schema";
import {
  badRequest,
  getSessionUser,
  notFound,
  unauthorized,
} from "@/lib/api";
import { commentContentSchema } from "@/lib/validation";
import { getTranslations } from "@/lib/i18n";
import { translateIssue } from "@/lib/i18n/translate-issue";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/posts/[id]/comments">,
) {
  const { id } = await ctx.params;

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      authorId: users.id,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorAvatarSeed: users.avatarSeed,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.postId, id))
    .orderBy(asc(comments.createdAt));

  return Response.json({
    comments: rows.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      author: {
        id: r.authorId,
        username: r.authorUsername,
        displayName: r.authorDisplayName,
        avatarSeed: r.authorAvatarSeed,
      },
    })),
  });
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/posts/[id]/comments">,
) {
  const { t } = await getTranslations();
  const { id } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const [post] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!post) return notFound("Post");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(t.validation.invalidBody);
  }

  const parsed = commentContentSchema.safeParse(
    (body as { content?: unknown })?.content,
  );
  if (!parsed.success) {
    return badRequest(translateIssue(parsed.error.issues[0]?.message, t));
  }

  const [created] = await db
    .insert(comments)
    .values({ postId: id, authorId: viewer.id, content: parsed.data })
    .returning({ id: comments.id, createdAt: comments.createdAt });

  if (post.authorId !== viewer.id) {
    await db.insert(notifications).values({
      userId: post.authorId,
      actorId: viewer.id,
      type: "comment",
      postId: id,
    });
  }

  return Response.json(
    {
      comment: {
        id: created.id,
        content: parsed.data,
        createdAt: created.createdAt.toISOString(),
        author: {
          id: viewer.id,
          username: viewer.username,
          displayName: viewer.displayName,
          avatarSeed: viewer.avatarSeed,
        },
      },
    },
    { status: 201 },
  );
}
