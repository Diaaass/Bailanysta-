import type { NextRequest } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { badRequest } from "@/lib/api";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: issue?.message ?? "Проверьте поля", field: issue?.path?.[0] },
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
      { error: "Это имя уже занято", field: "username" },
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
