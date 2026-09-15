import type { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/api";
import { SEARCH_PAGE_SIZE, searchPosts } from "@/lib/queries/search";

export async function GET(request: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const params = request.nextUrl.searchParams;
  const query = params.get("q") ?? "";

  const rawOffset = Number(params.get("offset"));
  const offset =
    Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

  return Response.json(
    await searchPosts(query, viewer.id, { limit: SEARCH_PAGE_SIZE, offset }),
  );
}
