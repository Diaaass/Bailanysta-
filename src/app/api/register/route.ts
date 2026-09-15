import type { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { badRequest } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { callerAddress, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getTranslations } from "@/lib/i18n";
import { translateIssue } from "@/lib/i18n/translate-issue";

export async function POST(request: NextRequest) {
  const { t } = await getTranslations();

  const limit = await checkRateLimit(
    "auth:signup",
    callerAddress(request.headers),
    RATE_LIMITS.signUp,
  );
  if (!limit.allowed) {
    return Response.json(
      { error: t.api.tooManySignups },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest(t.validation.invalidBody);
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: translateIssue(issue?.message, t), field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  const { username, password, displayName } = parsed.data;

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (taken) {
    return Response.json(
      { error: t.api.usernameTaken, field: "username" },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(users)
    .values({
      username,
      displayName,
      passwordHash: await hash(password, 10),
      avatarSeed: username,
    })
    .returning({ id: users.id, username: users.username });

  return Response.json({ user: created }, { status: 201 });
}
