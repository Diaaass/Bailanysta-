import type { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { badRequest, getSessionUser, unauthorized } from "@/lib/api";
import { FEED_PAGE_SIZE, getFeed, getPostById } from "@/lib/queries/posts";
import { postContentSchema } from "@/lib/validation";
import { indexPost } from "@/lib/ai/indexing";
import { detectLanguage } from "@/lib/language";
import { getTranslations } from "@/lib/i18n";
import { translateIssue } from "@/lib/i18n/translate-issue";

export async function GET(request: NextRequest) {
  const viewer = await getSessionUser();
  const { searchParams } = request.nextUrl;

  const scope = searchParams.get("scope") === "following" ? "following" : "all";
  const rawLimit = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, FEED_PAGE_SIZE)
      : FEED_PAGE_SIZE;

  const result = await getFeed({
    viewerId: viewer?.id ?? null,
    cursor: searchParams.get("cursor"),
    scope,
    limit,
  });

  return Response.json(result);
}

export async function POST(request: NextRequest) {
  const { t } = await getTranslations();
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

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

  const [created] = await db
    .insert(posts)
    .values({
      authorId: viewer.id,
      content: parsed.data,
      lang: detectLanguage(parsed.data),
    })
    .returning({ id: posts.id });

  // Awaited on purpose: a serverless function is frozen once it responds, so
  // background indexing would simply never run.
  await indexPost(created.id, parsed.data);

  const post = await getPostById(created.id, viewer.id);
  return Response.json({ post }, { status: 201 });
}
