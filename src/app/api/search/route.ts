import type { NextRequest } from "next/server";
import { getSessionUser, unauthorized } from "@/lib/api";
import { searchPosts } from "@/lib/queries/search";

export async function GET(request: NextRequest) {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const outcome = await searchPosts(query, viewer.id);

  return Response.json(outcome);
}
