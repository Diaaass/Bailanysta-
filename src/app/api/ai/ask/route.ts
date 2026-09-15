import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, getSessionUser, jsonError, unauthorized } from "@/lib/api";
import { AiUnavailableError, isAiConfigured } from "@/lib/ai/client";
import { askAboutOwnPosts } from "@/lib/ai/rag";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getTranslations } from "@/lib/i18n";
import { format } from "@/lib/i18n/format";
import { translateIssue } from "@/lib/i18n/translate-issue";

const bodySchema = z.object({
  question: z.string().trim().min(3, "questionTooShort").max(300),
});

export async function POST(request: NextRequest) {
  const { t } = await getTranslations();

  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  if (!isAiConfigured()) return jsonError(t.api.aiDisabled, 503);

  const limit = await checkRateLimit("ai:ask", viewer.id, RATE_LIMITS.ai);
  if (!limit.allowed) {
    return Response.json(
      {
        error: format(t.api.retryInMinutes, {
          n: Math.ceil(limit.retryAfterSeconds / 60),
        }),
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest(t.validation.invalidBody);
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(translateIssue(parsed.error.issues[0]?.message, t));
  }

  try {
    return Response.json(
      await askAboutOwnPosts(viewer.id, parsed.data.question),
    );
  } catch (e) {
    if (e instanceof AiUnavailableError) return jsonError(t.api.aiDisabled, 503);
    if (e instanceof Error && e.name === "AbortError") {
      return jsonError(t.api.aiTimeout, 504);
    }
    console.error("[ai/ask]", e);
    return jsonError(t.api.aiFailed, 502);
  }
}
