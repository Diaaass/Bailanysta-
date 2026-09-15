import { auth } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login", "/register"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth);
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!isAuthed && !isPublic) {
    const target = new URL("/login", req.nextUrl);
    target.searchParams.set("callbackUrl", pathname);
    return Response.redirect(target);
  }

  if (isAuthed && isPublic) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
