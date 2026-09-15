import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import {
  badRequest,
  forbidden,
  getSessionUser,
  notFound,
  unauthorized,
} from "@/lib/api";
import { getPostById } from "@/lib/queries/posts";
import { postContentSchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/posts/[id]">,
) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser();
  const post = await getPostById(id, viewer?.id ?? null);
  if (!post) return notFound("Post");
  return Response.json({ post });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/posts/[id]">,
) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const [existing] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (!existing) return notFound("Post");
  if (existing.authorId !== viewer.id) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = postContentSchema.safeParse(
    (body as { content?: unknown })?.content,
  );
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid content");
  }

  await db
    .update(posts)
    .set({ content: parsed.data, updatedAt: new Date(), embedding: null })
    .where(eq(posts.id, id));

  const post = await getPostById(id, viewer.id);
  return Response.json({ post });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/posts/[id]">,
) {
  const { id } = await ctx.params;
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const [existing] = await db
    .select({ authorId: posts.authorId })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);

  if (!existing) return notFound("Post");
  if (existing.authorId !== viewer.id) return forbidden();

  await db.delete(posts).where(eq(posts.id, id));
  return new Response(null, { status: 204 });
}
