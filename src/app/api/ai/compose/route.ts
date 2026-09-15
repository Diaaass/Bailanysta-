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
import { checkRateLimit } from "@/lib/ai/rate-limit";

const bodySchema = z.object({
  mode: z.enum(COMPOSE_MODES),
  text: z.string().trim().min(1, "Нужен текст").max(1000),
  targetLang: z.enum(Object.keys(LANGUAGES) as [LanguageCode, ...LanguageCode[]])
    .optional(),
});

export async function POST(request: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  if (!isAiConfigured()) {
    return jsonError(
      "AI-функции выключены: в окружении не задан AI_API_KEY",
      503,
    );
  }

  const limit = checkRateLimit(viewer.id);
  if (!limit.allowed) {
    return Response.json(
      {
        error: `Слишком много запросов. Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const { mode, text, targetLang } = parsed.data;

  try {
    const result = await chat(
      systemPrompt(mode as ComposeMode, targetLang),
      text,
      { maxTokens: mode === "hashtags" ? 60 : 400 },
    );

    if (!result) {
      return jsonError("Модель вернула пустой ответ", 502);
    }

    return Response.json({ result: result.slice(0, 500) });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return jsonError(e.message, 503);
    }
    if (e instanceof Error && e.name === "AbortError") {
      return jsonError("Модель не ответила вовремя. Попробуйте ещё раз.", 504);
    }
    console.error("[ai/compose]", e);
    return jsonError("Не удалось получить ответ модели", 502);
  }
}
