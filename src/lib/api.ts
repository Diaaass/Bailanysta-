import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  avatarSeed: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return session?.user?.id ? (session.user as SessionUser) : null;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export const unauthorized = () => jsonError("Authentication required", 401);
export const notFound = (what = "Resource") => jsonError(`${what} not found`, 404);
export const forbidden = () => jsonError("Not allowed", 403);

export function badRequest(message: string, details?: unknown) {
  return Response.json({ error: message, details }, { status: 400 });
}
