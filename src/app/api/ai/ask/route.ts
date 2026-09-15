import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, getSessionUser, jsonError, unauthorized } from "@/lib/api";
import { AiUnavailableError, isAiConfigured } from "@/lib/ai/client";
import { askAboutOwnPosts } from "@/lib/ai/rag";
import { checkRateLimit } from "@/lib/ai/rate-limit";

const bodySchema = z.object({
  question: z.string().trim().min(3, "Вопрос слишком короткий").max(300),
});

export async function POST(request: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  if (!isAiConfigured()) {
    return jsonError("AI-функции выключены: в окружении не задан AI_API_KEY", 503);
  }

  const limit = await checkRateLimit(viewer.id, "ask");
  if (!limit.allowed) {
    return Response.json(
      {
        error: `Слишком много вопросов. Попробуйте через ${Math.ceil(limit.retryAfterSeconds / 60)} мин.`,
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

  try {
    return Response.json(
      await askAboutOwnPosts(viewer.id, parsed.data.question),
    );
  } catch (e) {
    if (e instanceof AiUnavailableError) return jsonError(e.message, 503);
    if (e instanceof Error && e.name === "AbortError") {
      return jsonError("Модель не ответила вовремя. Попробуйте ещё раз.", 504);
    }
    console.error("[ai/ask]", e);
    return jsonError("Не удалось получить ответ модели", 502);
  }
}
