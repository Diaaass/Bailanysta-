import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, getSessionUser, jsonError, unauthorized } from "@/lib/api";
import { AiUnavailableError, chat, isAiConfigured } from "@/lib/ai/client";
import {
  COMPOSE_MODES,
  LANGUAGES,
  systemPrompt,
  type ComposeMode,
  type LanguageCode,
} from "@/lib/ai/prompts";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getTranslations } from "@/lib/i18n";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { format } from "@/lib/i18n/format";

const bodySchema = z.object({
  mode: z.enum(COMPOSE_MODES),
  text: z.string().trim().min(1, "postEmpty").max(1000),
  targetLang: z.enum(Object.keys(LANGUAGES) as [LanguageCode, ...LanguageCode[]])
    .optional(),
});

export async function POST(request: NextRequest) {
  const { t } = await getTranslations();

  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  if (!isAiConfigured()) return jsonError(t.api.aiDisabled, 503);

  const limit = await checkRateLimit("ai:compose", viewer.id, RATE_LIMITS.ai);
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

  const { mode, text, targetLang } = parsed.data;

  try {
    const result = await chat(
      systemPrompt(mode as ComposeMode, targetLang),
      text,
      { maxTokens: mode === "hashtags" ? 600 : 1200 },
    );

    if (!result) {
      return jsonError(t.api.aiEmpty, 502);
    }

    return Response.json({ result: result.slice(0, 500) });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return jsonError(t.api.aiDisabled, 503);
    }
    if (e instanceof Error && e.name === "AbortError") {
      return jsonError(t.api.aiTimeout, 504);
    }
    console.error("[ai/compose]", e);
    return jsonError(t.api.aiFailed, 502);
  }
}
