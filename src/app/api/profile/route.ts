import type { NextRequest } from "next/server";
import { badRequest, getSessionUser, notFound, unauthorized } from "@/lib/api";
import { updateProfile } from "@/lib/queries/users";
import { profileUpdateSchema } from "@/lib/validation";
import { getTranslations } from "@/lib/i18n";
import { translateIssue } from "@/lib/i18n/translate-issue";

export async function PATCH(request: NextRequest) {
  const { t } = await getTranslations();
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest(t.validation.invalidBody);
  }

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: translateIssue(issue?.message, t), field: issue?.path?.[0] },
      { status: 400 },
    );
  }

  const updated = await updateProfile(viewer.id, parsed.data);
  if (!updated) return notFound("User");

  return Response.json({ profile: updated });
}
