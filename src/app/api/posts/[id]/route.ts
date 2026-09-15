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
import { indexPost } from "@/lib/ai/indexing";
import { detectLanguage } from "@/lib/language";
import { getTranslations } from "@/lib/i18n";
import { translateIssue } from "@/lib/i18n/translate-issue";

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
  const { t } = await getTranslations();
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
    return badRequest(t.validation.invalidBody);
  }

  const parsed = postContentSchema.safeParse(
    (body as { content?: unknown })?.content,
  );
  if (!parsed.success) {
    return badRequest(translateIssue(parsed.error.issues[0]?.message, t));
  }

  await db
    .update(posts)
    .set({
      content: parsed.data,
      lang: detectLanguage(parsed.data),
      updatedAt: new Date(),
      embedding: null,
    })
    .where(eq(posts.id, id));

  // The old vector describes text that no longer exists, so it is cleared
  // above and recomputed here.
  await indexPost(id, parsed.data);

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
