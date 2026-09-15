import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser, notFound } from "@/lib/api";
import { FEED_PAGE_SIZE, getFeed } from "@/lib/queries/posts";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/users/[username]/posts">,
) {
  const { username } = await ctx.params;
  const viewer = await getSessionUser();

  const [author] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  if (!author) return notFound("User");

  const result = await getFeed({
    viewerId: viewer?.id ?? null,
    cursor: request.nextUrl.searchParams.get("cursor"),
    authorId: author.id,
    limit: FEED_PAGE_SIZE,
  });

  return Response.json(result);
}
